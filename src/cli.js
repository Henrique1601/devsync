#!/usr/bin/env node
import { daemon } from './daemon.js';
import { read } from './store.js';
const [command = 'help', argument, extra, deviceId, name] = process.argv.slice(2);
try {
  if (command === 'daemon') await daemon();
  else if (command === 'coordinator') {
    const { createCoordinator } = await import('./coordinator.js');
    const coordinator = await createCoordinator({ directory: process.env.DEVSYNC_COORDINATOR_HOME || './coordinator-data', adminToken: process.env.DEVSYNC_ADMIN_TOKEN, host: process.env.DEVSYNC_COORDINATOR_HOST || '127.0.0.1', port: Number(process.env.DEVSYNC_COORDINATOR_PORT || 8787) });
    console.log(`Coordenador: porta ${coordinator.server.address().port}`);
    const stop = async () => { await coordinator.close(); process.exit(0); };process.on('SIGINT',stop);process.on('SIGTERM',stop);
  }
  else if (command === 'mcp') {
    const { startMcpServer } = await import('./mcp.js');
    await startMcpServer();
  }
  else if (command === 'help') {
    console.log(`DevSync 0.9.0 — Node.js 22+ e Git

  devsync daemon                         Inicia serviço local
  devsync mcp                            Inicia servidor MCP (Model Context Protocol) via stdio
  devsync add <pasta>                     Cadastra clone com upstream
  devsync add-batch <pastas...>           Cadastra múltiplos projetos em lote
  devsync import <pasta-raiz>             Varre pasta e cadastra todos os repositórios Git encontrados
  devsync clone <url-github> <nova-pasta>  Clona e cadastra um projeto
  devsync status                         Exibe projetos e conexão remota
  devsync metrics                        Exibe estatísticas de sincronização e tempo economizado
  devsync history [id] [limite]           Exibe histórico persistente
  devsync diagnose <pasta>               Verifica Git e configuração
  devsync diff <id>                      Exibe arquivos alterados e diff seguro
  devsync predict-conflicts <id>         Simula em memória se haverá conflitos no Git
  devsync scan-secrets <id>              Analisa arquivos alterados contra vazamento de chaves
  devsync ai-resolve <id> <arquivo>      Gera resolução semântica do conflito usando IA
  devsync scout [pasta]                  Varre e descobre repositórios Git no computador
  devsync worktree-sync <id> <branch>    Sincroniza branch secundária via worktree isolada
  devsync daily-summary [data]           Gera diário de bordo e resumo de produtividade no Obsidian
  devsync catch-up [id]                  Briefing matinal executivo e retomada de contexto com IA
  devsync p2p-peers                      Lista outros computadores DevSync na rede local (LAN)
  devsync settings <id> <intervalo> <espera> <padrões separados por vírgula>
  devsync sync <id>                       Sincroniza projeto agora (ou --all para todos)
  devsync sync-all                       Sincroniza todos os projetos ativos em lote
  devsync stash-sync <id> [--no-pop]      Guarda alterações em Stash seguro e sincroniza
  devsync pause <id> / resume <id>        Pausa ou retoma automação
  devsync push-on <id> / push-off <id>    Controla envio automático
  devsync checkpoint-on <id>              Autoriza commits automáticos
  devsync checkpoint-off <id>             Desativa commits automáticos
  devsync webhook-config <url> [serviço] [chatId]  Configura webhook (Discord/Telegram/Genérico)
  devsync webhook-test                   Envia notificação de teste pelo webhook
  devsync webhook-off                    Desativa notificações de webhook
  devsync check-remote <url>              Testa conectividade com coordenador remoto
  devsync remote-config <url> <token> <device-id> <nome>
  devsync remote-off                     Desconecta painel remoto
  devsync dashboard                      Exibe endereço do painel
  devsync coordinator                    Inicia coordenador remoto

Aplicativo desktop: npm run desktop
Instalador Windows: npm run dist
Checkpoints e envio são optativos e começam desativados.`);
  } else {
    const runtime = await read('runtime.json');
    const url = `http://127.0.0.1:${runtime.port}`;
    if (command === 'dashboard') console.log(`${url}/#${runtime.token}`);
    else if (command === 'import') {
      const rootDir = argument || process.cwd();
      console.log(`Buscando repositórios Git em: ${rootDir}...`);
      const scoutRes = await fetch(`${url}/api/command`, {
        method: 'POST', signal: AbortSignal.timeout(180000),
        headers: { authorization: `Bearer ${runtime.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'scout', rootDir })
      });
      const scoutData = await scoutRes.json();
      if (!scoutRes.ok) throw new Error(scoutData.error);
      const unregistered = (scoutData.repositories || scoutData.repos || []).filter(r => !r.alreadyRegistered && r.hasGit !== false);
      if (!unregistered.length) {
        console.log(`Nenhum novo repositório pendente de cadastro encontrado em ${rootDir}. (Total encontrados: ${scoutData.count || 0})`);
      } else {
        console.log(`Encontrados ${unregistered.length} novo(s) repositório(s). Cadastrando em lote...`);
        const batchRes = await fetch(`${url}/api/command`, {
          method: 'POST', signal: AbortSignal.timeout(180000),
          headers: { authorization: `Bearer ${runtime.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'add-batch', paths: unregistered.map(r => r.path) })
        });
        const batchData = await batchRes.json();
        if (!batchRes.ok) throw new Error(batchData.error);
        console.log(JSON.stringify(batchData, null, 2));
      }
    } else {
      const normalized = command === 'sync' && argument === '--all' ? 'sync-all' : command;
      const readonly = ['status', 'history', 'metrics'].includes(normalized);
      const route = normalized === 'history' ? 'history?' + new URLSearchParams({ ...(argument ? { projectId: argument } : {}), ...(extra ? { limit: extra } : {}) }) : ['status', 'metrics'].includes(normalized) ? normalized : 'command';
      const payload = normalized === 'clone' ? { command: normalized, url: argument, path: extra }
        : normalized === 'add-batch' ? { command: normalized, paths: [argument, extra, deviceId, name, ...process.argv.slice(7)].filter(Boolean).flatMap(p => p.split(/[,;\n]/)).map(s => s.trim()).filter(Boolean) }
        : normalized === 'remote-config' ? { command: normalized, settings: { url: argument, token: extra, deviceId, name } }
        : normalized === 'check-remote' ? { command: normalized, url: argument }
        : normalized === 'webhook-config' ? { command: normalized, settings: { url: argument, service: extra, chatId: deviceId } }
        : ['webhook-test', 'webhook-off', 'p2p-peers'].includes(normalized) ? { command: normalized }
        : normalized === 'scout' ? { command: normalized, path: argument }
        : normalized === 'worktree-sync' ? { command: normalized, id: argument, branch: extra }
        : normalized === 'daily-summary' ? { command: normalized, date: argument }
        : normalized === 'catch-up' ? { command: normalized, id: argument }
        : normalized === 'scan-secrets' ? { command: normalized, id: argument }
        : normalized === 'ai-resolve' ? { command: normalized, id: argument, file: extra }
        : normalized === 'stash-sync' ? { command: normalized, id: argument, pop: extra !== '--no-pop' }
        : normalized === 'settings' ? { command: normalized, id: argument, ...(extra === undefined ? {} : { syncIntervalSeconds: Number(extra) }), ...(deviceId === undefined ? {} : { checkpointDelaySeconds: Number(deviceId) }), ...(name === undefined ? {} : { checkpointInclude: name.split(',').map(value => value.trim()) }) }
        : { command: normalized, path: argument, id: argument };
      const response = await fetch(`${url}/api/${route}`, {
        method: readonly ? 'GET' : 'POST', signal: AbortSignal.timeout(180000),
        headers: { authorization: `Bearer ${runtime.token}`, 'Content-Type': 'application/json' },
        ...(readonly ? {} : { body: JSON.stringify(payload) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      console.log(JSON.stringify(result, null, 2));
    }
  }
} catch (error) { console.error(`DevSync: ${error.message}`); process.exitCode = 1; }
