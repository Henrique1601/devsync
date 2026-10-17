import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, rm, realpath, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { home, read, write } from './store.js';
import { git, inspect, inspectDiff, predictConflicts, stashAndSync, synchronize } from './git.js';
import { validateWebhookSettings, sendWebhook } from './webhooks.js';
import { calculateMetrics } from './metrics.js';
import { scanDiff } from './secrets.js';
import { resolveConflictAI } from './ai.js';
import { scoutRepositories } from './scout.js';
import { syncBranchWorktree } from './worktree.js';
import { P2PManager } from './p2p.js';
import { startRemote, validateRemote } from './remote-client.js';
import { acquireServiceLock } from './service-lock.js';
import { rulesFor, validateRules, isSyncDue } from './rules.js';
import { createHistory, historySnapshot, stateReasons } from './history.js';
import { diagnose } from './onboarding.js';
import { settleOperations, withBusy } from './operations.js';
class CommandError extends Error {}
export async function daemon() {
  await mkdir(home, { recursive: true, mode: 0o700 });
  const lock = await acquireServiceLock(home);
  let server, timer, remote, signalStop, p2p;
  let mutations = Promise.resolve();
  let stopping = false;
  try {
    const config = await read('config.json', { projects: [] });
    const history = await createHistory();
    const lastRuns = new Map();
    const states = new Map();
    const busy = new Set();
    const token = randomBytes(32).toString('hex');
    const page = await readFile(fileURLToPath(new URL('../ui/index.html', import.meta.url)));
    async function snapshot(repo) {
      const status = await inspect(repo).catch(() => ({ state: 'error' }));
      const head = await git(repo.path, 'rev-parse', '--verify', 'HEAD').catch(() => null);
      return historySnapshot({ ...status, head });
    }
    async function sync(repo, source = 'automatic') {
      if (busy.has(repo.id)) return;
      return withBusy(busy, repo.id, async () => {
      const startedAt = new Date().toISOString();
      const before = await snapshot(repo);
      try {
        const result = await synchronize(repo);
        states.set(repo.id, { ...result, reason: stateReasons[result.state], checkedAt: new Date().toISOString() });
      }
      catch (error) { states.set(repo.id, { ...error.activity, state: 'error', message: error.message.startsWith('Checkpoint bloqueado:') ? error.message : 'Falha no Git: confira rede, credenciais, identidade de commit e upstream pelo terminal.', checkedAt: new Date().toISOString() }); }
      lastRuns.set(repo.id, Date.now());
      const result = states.get(repo.id);
      await history.append({ projectId: repo.id, projectName: repo.name, source, action: 'sync', startedAt, finishedAt: result.checkedAt,
        ...result, reason: result.message || stateReasons[result.state], before, after: { ...await snapshot(repo), state: result.state } });
      if (config.webhook?.enabled && ['synced', 'checkpoint', 'error', 'diverged'].includes(result.state)) {
        sendWebhook(config.webhook, {
          type: result.state,
          project: repo,
          message: result.message || stateReasons[result.state],
          receivedCommits: result.receivedCommits || 0,
          sentCommits: result.sentCommits || 0
        }).catch(() => {});
      }
      });
    }
    let ticking = false;
    async function tick() {
      if (ticking || stopping) return;
      ticking = true;
      const pending = mutations.then(() => settleOperations(config.projects.filter(repo => isSyncDue(repo, lastRuns.get(repo.id))).map(repo => sync(repo))));
      mutations = pending.catch(() => {});
      try { await pending; } finally { ticking = false; }
    }
    const projectStatus = () => config.projects.map(p => ({ ...p, ...rulesFor(p), ...(states.get(p.id) || { state: 'pending' }), busy: busy.has(p.id) }));
    async function execute(data, source = 'manual') {
      if (stopping) throw new CommandError('O serviço está encerrando. Aguarde e abra o DevSync novamente.');
      const pending = mutations.then(() => perform(data, source)); mutations = pending.catch(() => {}); return pending;
    }
    async function perform(data, source = 'manual') {
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new CommandError('Parâmetros do comando inválidos.');
      if (data.command === 'diagnose') return diagnose(data.path);
      if (data.command === 'check-remote') {
        if (typeof data.url !== 'string' || !data.url.trim()) throw new CommandError('Informe a URL do coordenador remoto.');
        let parsed;
        try { parsed = new URL(data.url.trim()); } catch { throw new CommandError('URL do coordenador inválida.'); }
        const local = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname);
        if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) throw new CommandError('O coordenador remoto exige HTTPS fora de localhost.');
        const base = parsed.origin;
        const start = Date.now();
        try {
          const r = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
          const body = await r.json().catch(() => ({}));
          if (!r.ok || !body.ok) throw new Error();
          return { ok: true, url: base, latencyMs: Date.now() - start };
        } catch {
          throw new CommandError('Não foi possível conectar ao coordenador em ' + base + '. Verifique o endereço e se o servidor está ativo.');
        }
      }
      if (data.command === 'sync-all') {
        const active = config.projects.filter(p => !p.paused && !busy.has(p.id));
        await settleOperations(active.map(repo => sync(repo, source)));
        return { synced: active.length, projects: projectStatus() };
      }
      if (data.command === 'remote-config') {
        let settings;
        try { settings = validateRemote(data.settings); } catch (error) { throw new CommandError(error.message); }
        await write('config.json', { ...config, remote: settings }); config.remote = settings; return { ok: true };
      }
      if (data.command === 'remote-off') { const { remote: ignored, ...next } = config; await write('config.json', next); delete config.remote; return { ok: true }; }
      if (data.command === 'metrics') {
        const historyEntries = history.query({ limit: 500 }).entries;
        return calculateMetrics(historyEntries, config.projects);
      }
      if (data.command === 'webhook-config') {
        let settings;
        try { settings = validateWebhookSettings(data.settings); } catch (error) { throw new CommandError(error.message); }
        await write('config.json', { ...config, webhook: settings });
        config.webhook = settings;
        return { ok: true, webhook: { ...settings, url: settings.url.replace(/:[^:@]+@/, ':***@') } };
      }
      if (data.command === 'webhook-off') {
        const { webhook: ignored, ...next } = config;
        await write('config.json', next);
        delete config.webhook;
        return { ok: true };
      }
      if (data.command === 'webhook-test') {
        if (!config.webhook?.url) throw new CommandError('Webhook não configurado. Configure a URL antes de testar.');
        const res = await sendWebhook(config.webhook, {
          type: 'test',
          project: { name: 'DevSync Teste' },
          message: 'Notificação de teste do DevSync entregue com sucesso!'
        });
        if (!res?.ok) throw new CommandError('Falha no teste do webhook: ' + (res?.error || `status HTTP ${res?.status}`));
        return { ok: true, status: res.status };
      }
      if (data.command === 'scout') {
        const rootPath = data.path || path.resolve(process.cwd(), '..');
        const existingPaths = new Set(config.projects.map(p => p.path));
        const repos = await scoutRepositories(rootPath, { existingPaths });
        return { root: rootPath, repos, found: repos.length };
      }
      if (data.command === 'add-batch') {
        if (!Array.isArray(data.paths) || !data.paths.length) throw new CommandError('Informe uma lista de caminhos em paths.');
        const added = [];
        const errors = [];
        for (const p of data.paths) {
          try {
            const res = await add(p);
            added.push(res);
          } catch (err) {
            errors.push({ path: p, error: err.message });
          }
        }
        return { ok: true, added, errors };
      }
      if (data.command === 'worktree-sync') {
        const repo = config.projects.find(p => p.id === data.id);
        if (!repo) throw new CommandError('Projeto não encontrado.');
        if (!data.branch) throw new CommandError('Informe a branch para sincronização via worktree.');
        return await syncBranchWorktree(repo, data.branch);
      }
      if (data.command === 'daily-summary') {
        const date = data.date || new Date().toISOString().slice(0, 10);
        const res = await history.dailySummary({ date });
        return { ok: true, summary: res };
      }
      if (data.command === 'p2p-peers') {
        return { ok: true, peers: p2p?.getPeers() || [] };
      }
      if (data.command === 'clone') {
        if (typeof data.url !== 'string' || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/.test(data.url)) throw new CommandError('Informe uma URL HTTPS de repositório do GitHub, sem credenciais.');
        if (typeof data.path !== 'string' || !data.path.trim() || !path.isAbsolute(data.path.trim())) throw new CommandError('Informe o caminho absoluto da nova pasta de destino.');
        const destination = path.resolve(data.path.trim());
        try { await realpath(destination); throw new CommandError('A pasta de destino já existe. Escolha uma nova pasta.'); }
        catch (error) { if (error instanceof CommandError) throw error; if (error.code !== 'ENOENT') throw new CommandError('Sem acesso à pasta de destino.'); }
        const parent = await realpath(path.dirname(destination)).catch(() => { throw new CommandError('A pasta que receberá o clone não existe.'); });
        try { await git(parent, 'clone', '--', data.url, destination); }
        catch { throw new CommandError('Não foi possível clonar. Confira o repositório, rede e autenticação do Git. O clone parcial, se existir, foi preservado.'); }
        return perform({ command: 'add', path: destination }, source);
      }
      if (!['add', 'sync', 'diff', 'stash-sync', 'predict-conflicts', 'scan-secrets', 'ai-resolve', 'resolve-conflict', 'pause', 'resume', 'push-on', 'push-off', 'checkpoint-on', 'checkpoint-off', 'settings'].includes(data.command)) throw new CommandError('Comando desconhecido.');
      if (data.command === 'add') {
        if (typeof data.path !== 'string' || !data.path.trim()) throw new CommandError('Informe o caminho da pasta do projeto.');
        const folder = data.path.trim().replace(/^"(.*)"$/, '$1');
        if (/^https?:\/\//i.test(folder)) throw new CommandError('Este campo espera uma pasta local. Use Clonar do GitHub para cadastrar por URL.');
        let absolute, root, branch;
        try { absolute = await realpath(path.resolve(folder)); }
        catch { throw new CommandError('Pasta não encontrada ou sem acesso. Confira o caminho informado.'); }
        try { root = await realpath(await git(absolute, 'rev-parse', '--show-toplevel')); }
        catch { throw new CommandError('A pasta precisa pertencer a um repositório Git. Confira também se o Git está instalado e acessível.'); }
        if (config.projects.some(p => process.platform === 'win32' ? p.path.toLowerCase() === root.toLowerCase() : p.path === root)) throw new CommandError('Projeto já cadastrado.');
        try { branch = await git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD'); }
        catch { throw new CommandError('O projeto está sem uma branch ativa (HEAD destacado). Selecione uma branch antes de cadastrar.'); }
        const p = { id: randomBytes(6).toString('hex'), name: path.basename(root), path: root, branch, paused: false, autoPush: false, checkpoint: false, ...rulesFor({}) };
        try { await git(root, 'rev-parse', '--verify', 'HEAD'); }
        catch { throw new CommandError('O repositório ainda não tem commits. Crie o primeiro commit antes de cadastrar.'); }
        try { await git(root, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'); }
        catch { throw new CommandError(`A branch ${branch} não tem upstream configurado. Configure a branch remota de acompanhamento antes de cadastrar.`); }
        await inspect(p);
        await write('config.json', { ...config, projects: [...config.projects, p] });
        config.projects.push(p); await sync(p, 'registration'); return { project: p };
      }
      const repo = config.projects.find(p => p.id === data.id || p.name === data.id);
      if (!repo) throw new CommandError('Projeto não encontrado. Use o ID exibido em status.');
      if (data.command === 'diff') {
        try { return await inspectDiff(repo); }
        catch (error) { throw new CommandError(error.message || 'Não foi possível inspecionar as alterações do projeto.'); }
      }
      if (data.command === 'predict-conflicts') {
        try { return await predictConflicts(repo); }
        catch (error) { throw new CommandError(error.message || 'Não foi possível prever conflitos.'); }
      }
      if (data.command === 'scan-secrets') {
        try {
          const diffData = await inspectDiff(repo);
          const scan = scanDiff(diffData.diff);
          return {
            safe: scan.safe,
            found: scan.leaks.length,
            findings: scan.leaks.map(l => ({ rule: l.type, file: l.file, masked: l.preview })),
            leaks: scan.leaks
          };
        } catch (error) { throw new CommandError(error.message || 'Não foi possível verificar segredos.'); }
      }
      if (data.command === 'ai-resolve') {
        if (!data.file || typeof data.file !== 'string') throw new CommandError('Informe o arquivo em conflito.');
        try {
          let fileContent = '';
          try { fileContent = await readFile(path.resolve(repo.path, data.file), 'utf8'); } catch {}
          let ours = '', theirs = '', base = '';
          if (fileContent.includes('<<<<<<<')) {
            const parts = fileContent.split(/<<<<<<<.*?\r?\n/);
            if (parts[1]) {
              const sub = parts[1].split(/=======\r?\n/);
              ours = sub[0] || '';
              theirs = (sub[1] || '').split(/>>>>>>>.*?\r?\n/)[0] || '';
            }
          }
          if (!ours && !theirs) {
            ours = fileContent;
            const conf = await predictConflicts(repo);
            theirs = conf.preview || '';
          }
          return await resolveConflictAI({ file: data.file, ours, theirs, base });
        } catch (error) { throw new CommandError(error.message || 'Não foi possível gerar resolução com IA.'); }
      }
      if (data.command === 'resolve-conflict') {
        if (!data.file || typeof data.resolvedCode !== 'string') throw new CommandError('Informe o arquivo e o código resolvido.');
        const targetPath = path.resolve(repo.path, data.file);
        if (!targetPath.toLowerCase().startsWith(path.resolve(repo.path).toLowerCase())) throw new CommandError('Caminho de arquivo inválido.');
        try {
          await writeFile(targetPath, data.resolvedCode, 'utf8');
          await git(repo.path, 'add', '--', data.file);
          return { ok: true, file: data.file };
        } catch (error) { throw new CommandError('Não foi possível salvar a resolução do conflito: ' + error.message); }
      }
      if (data.command === 'stash-sync') {
        if (busy.has(repo.id)) throw new CommandError('Projeto já está sincronizando. Aguarde a operação terminar.');
        return withBusy(busy, repo.id, async () => {
          const startedAt = new Date().toISOString();
          const before = await snapshot(repo);
          try {
            const result = await stashAndSync(repo, { pop: data.pop !== false });
            states.set(repo.id, { ...result, reason: result.message || stateReasons[result.state], checkedAt: new Date().toISOString() });
          } catch (error) {
            throw new CommandError(error.message || 'Falha ao executar Stash seguro e sincronização.');
          }
          lastRuns.set(repo.id, Date.now());
          const result = states.get(repo.id);
          await history.append({ projectId: repo.id, projectName: repo.name, source, action: 'stash-sync', startedAt, finishedAt: result.checkedAt,
            ...result, reason: result.message || stateReasons[result.state], before, after: { ...await snapshot(repo), state: result.state } });
          return result;
        });
      }
      if (data.command === 'sync') {
        if (busy.has(repo.id)) throw new CommandError('Projeto já está sincronizando. Aguarde a operação terminar.');
        await sync(repo, source); return states.get(repo.id);
      }
      if (busy.has(repo.id)) throw new CommandError('Aguarde a sincronização terminar antes de mudar as regras.');
      const changes = { pause: { paused: true }, resume: { paused: false }, 'push-on': { autoPush: true }, 'push-off': { autoPush: false }, 'checkpoint-on': { checkpoint: true }, 'checkpoint-off': { checkpoint: false } };
      let settings = {};
      if (data.command === 'settings') {
        try { settings = validateRules(data); } catch (error) { throw new CommandError(error.message); }
        if (!Object.keys(settings).length) throw new CommandError('Informe pelo menos uma regra de sincronização.');
      }
      const updated = { ...repo, ...rulesFor(repo), ...changes[data.command], ...settings };
      const projects = config.projects.map(p => p.id === repo.id ? updated : p);
      await write('config.json', { ...config, projects }); config.projects = projects;
      const now = new Date().toISOString();
      const current = await snapshot(updated);
      await history.append({ projectId: repo.id, projectName: repo.name, source, action: data.command, startedAt: now, finishedAt: now,
        state: updated.paused ? 'paused' : current.state, reason: 'Regras do projeto atualizadas pelo usuário.', before: current, after: current });
      return { project: updated };
    }
    remote = startRemote(() => config.remote, projectStatus, async data => {
      if (!['sync', 'pause', 'resume'].includes(data.command)) throw new CommandError('Comando remoto não permitido.');
      return execute(data, 'remote');
    });
    server = http.createServer(async (req, res) => {
      const json = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
      try {
        const authority = `127.0.0.1:${server.address().port}`;
        if (req.headers.host !== authority || (req.headers.origin && req.headers.origin !== `http://${authority}`)) return json(403, { error: 'Origem inválida.' });
        if (req.method === 'GET' && req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'" });
          return res.end(page);
        }
        if (req.method === 'GET' && req.url === '/hud.html') {
          const content = await readFile(fileURLToPath(new URL('../ui/hud.html', import.meta.url)));
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(content);
        }
        if (req.method === 'GET' && req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
        if (req.method === 'GET' && ['/assets/local.js', '/assets/local.css'].includes(req.url)) {
          const name = req.url.endsWith('.js') ? 'local.js' : 'local.css';
          const content = await readFile(fileURLToPath(new URL(`../ui/${name}`, import.meta.url)));
          res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'text/css; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
          return res.end(content);
        }
        if (req.headers.authorization !== `Bearer ${token}`) return json(401, { error: 'Token inválido.' });
        if (req.method === 'GET' && req.url === '/api/status') return json(200, {
          projects: projectStatus(),
          remote: { ...remote.status(), ...(config.remote ? { url: config.remote.url, name: config.remote.name, deviceId: config.remote.deviceId } : {}) },
          webhook: config.webhook ? { enabled: config.webhook.enabled, service: config.webhook.service, url: config.webhook.url.replace(/:[^:@]+@/, ':***@'), chatId: config.webhook.chatId } : null
        });
        if (req.method === 'GET' && req.url === '/api/metrics') {
          const historyEntries = history.query({ limit: 500 }).entries;
          return json(200, calculateMetrics(historyEntries, config.projects));
        }
        if (req.method === 'GET' && new URL(req.url, `http://${authority}`).pathname === '/api/history') {
          const query = new URL(req.url, `http://${authority}`).searchParams;
          try { return json(200, history.query({ projectId: query.get('projectId') || undefined, limit: query.has('limit') ? Number(query.get('limit')) : 100 })); }
          catch (error) { throw new CommandError(error.message); }
        }
        if (req.method !== 'POST' || req.url !== '/api/command') return json(404, { error: 'Rota desconhecida.' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) return json(413, { error: 'Pedido grande demais.' }); }
        let data;
        try { data = JSON.parse(raw); } catch { throw new CommandError('Pedido inválido: envie um JSON válido.'); }
        return json(200, await execute(data));
      } catch (error) {
        json(error instanceof CommandError ? 400 : 500, { error: error instanceof CommandError ? error.message : 'Falha interna ao executar o comando. Confira o acesso aos arquivos e o estado do Git.' });
      }
    });
    server.requestTimeout = 15000;
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const port = server.address().port;
    await write('runtime.json', { port, token, pid: process.pid });
    try {
      p2p = new P2PManager({
        deviceId: config.remote?.deviceId || 'devsync-' + process.pid,
        name: config.remote?.name || 'DevSync Node',
        httpPort: port,
        token
      });
      p2p.start();
    } catch {}
    console.log(`Painel local: http://127.0.0.1:${port}/#${token}`);
    timer = setInterval(() => tick().catch(() => console.error('Não foi possível concluir a verificação ou gravar o histórico.')), 1000);
    async function stop() {
      if (stopping) return; stopping = true;
      clearInterval(timer);
      try { p2p?.stop(); } catch {}
      await remote.stop();
      server.close();
      await mutations;
      while (busy.size) await new Promise(resolve => setTimeout(resolve, 50));
      await rm(path.join(home, 'runtime.json'), { force: true });
      await rm(lock, { recursive: true, force: true });
      process.exit(0);
    }
    signalStop = stop;
    process.on('SIGINT', stop); process.on('SIGTERM', stop);
    await tick(); await remote.poll();
    return { port, token, stop: async () => {
      if (stopping) return;
      stopping = true; clearInterval(timer);
      try { p2p?.stop(); } catch {}
      await remote.stop();
      await new Promise(resolve => server.close(resolve)); await mutations;
      while (busy.size) await new Promise(resolve => setTimeout(resolve, 50));
      process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
      await rm(path.join(home, 'runtime.json'), { force: true }); await rm(lock, { recursive: true, force: true });
    } };
  } catch (e) {
    stopping = true;
    clearInterval(timer); await remote?.stop(); server?.close();
    await mutations;
    if (signalStop) { process.removeListener('SIGINT', signalStop); process.removeListener('SIGTERM', signalStop); }
    await rm(path.join(home, 'runtime.json'), { force: true });
    await rm(lock, { recursive: true, force: true }); throw e;
  }
}
