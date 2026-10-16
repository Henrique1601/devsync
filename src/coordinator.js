import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED = new Set(['sync', 'pause', 'resume']);
function matches(actual, expected) {
  const a = Buffer.from(actual || ''), b = Buffer.from(expected || '');
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function createCoordinator({ directory, adminToken, host = '127.0.0.1', port = 8787, storage = process.env.DEVSYNC_COORDINATOR_STORAGE || 'json' }) {
  if (!adminToken || adminToken.length < 32) throw new Error('DEVSYNC_ADMIN_TOKEN precisa de pelo menos 32 caracteres.');
  if (!['json', 'sqlite'].includes(storage)) throw new Error('DEVSYNC_COORDINATOR_STORAGE deve ser json ou sqlite.');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, 'coordinator.json');
  let data = { devices: [], jobs: [] };
  let sqliteDb = null;
  if (storage === 'sqlite') {
    const { DatabaseSync } = await import('node:sqlite');
    sqliteDb = new DatabaseSync(path.join(directory, 'coordinator.sqlite'));
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS coordinator_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    const row = sqliteDb.prepare('SELECT payload FROM coordinator_state WHERE id = 1').get();
    if (row?.payload) data = JSON.parse(row.payload);
  } else {
    try { data = JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; data = { devices: [], jobs: [] }; }
  }
  const page = await readFile(new URL('../ui/remote.html', import.meta.url));
  let writes = Promise.resolve();
  async function save() {
    // Keep recent completed jobs while retaining all pending jobs for offline PCs.
    const complete = data.jobs.filter(j => j.status === 'completed').slice(-200);
    data.jobs = [...data.jobs.filter(j => j.status !== 'completed'), ...complete];
    const snapshot = JSON.stringify(data, null, 2);
    const pending = writes.then(async () => {
      if (sqliteDb) {
        sqliteDb.prepare('INSERT INTO coordinator_state (id, payload, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at')
          .run(snapshot, new Date().toISOString());
      } else {
        await writeFile(filename + '.tmp', snapshot, { mode: 0o600 });
        await rename(filename + '.tmp', filename);
      }
    });
    writes = pending.catch(() => {}); await pending;
  }
  let requests = Promise.resolve();
  const server = http.createServer((req, res) => {
    // Health probes must not wait for an authenticated request reading its body.
    // Never expose device data, tokens, paths or queue contents here.
    if (req.method === 'GET' && req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(JSON.stringify({ ok: true }));
    }
    const handle = async () => {
      const reply = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
      try {
        if (req.method === 'GET' && req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
          return res.end(page);
        }
        if (req.method === 'GET' && req.url === '/manifest.json') {
          const manifest = JSON.stringify({
            name: 'DevSync Coordenador',
            short_name: 'DevSync',
            start_url: '/',
            display: 'standalone',
            background_color: '#0d1424',
            theme_color: '#0d1424',
            icons: [{ src: '/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' }]
          });
          res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' });
          return res.end(manifest);
        }
        if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
        // Reject browser cross-origin requests even when a token is available.
        if (req.headers.origin) {
          let origin;
          try { origin = new URL(req.headers.origin); } catch { return reply(403, { error: 'Origem inválida.' }); }
          // Match the original Host preserved by the HTTPS proxy. Forwarded
          // headers supplied by clients are deliberately not trusted.
          if (!['http:', 'https:'].includes(origin.protocol) || origin.host !== req.headers.host || origin.username || origin.password) return reply(403, { error: 'Origem inválida.' });
        }
        const supplied = req.headers.authorization?.replace(/^Bearer /, '');
        const admin = matches(supplied, adminToken);
        const device = data.devices.find(d => matches(supplied, d.token));
        if (!admin && !device) return reply(401, { error: 'Token inválido.' });
        if (req.method === 'GET' && req.url === '/api/devices' && admin) return reply(200, { devices: data.devices.map(({ token, ...d }) => ({ ...d, online: Boolean(d.lastSeen && Date.now() - Date.parse(d.lastSeen) < 35000) })), jobs: data.jobs });
        if (req.method !== 'POST') return reply(404, { error: 'Rota desconhecida.' });
        const chunks = [];
        let size = 0;
        for await (const chunk of req.iterator({ destroyOnReturn: false })) {
          size += chunk.length;
          if (size > 262144) { req.resume(); return reply(413, { error: 'Pedido grande demais.' }); }
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        let body;
        try { body = JSON.parse(raw); } catch { return reply(400, { error: 'JSON inválido.' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'Parâmetros inválidos.' });
        if (req.url === '/api/pair' && admin) {
          if (typeof body.name !== 'string' || !body.name.trim()) return reply(400, { error: 'Informe o nome do computador.' });
          const d = { id: randomBytes(12).toString('hex'), name: body.name.trim().slice(0,80), token: randomBytes(32).toString('hex'), projects: [], lastSeen: null };
          data.devices.push(d); await save(); return reply(201, { deviceId: d.id, token: d.token, name: d.name });
        }
        if (req.url === '/api/queue' && admin) {
          const target = data.devices.find(d => d.id === body.deviceId);
          if (!target || !ALLOWED.has(body.command) || typeof body.projectId !== 'string' || !target.projects.some(p => p.id === body.projectId)) return reply(400, { error: 'Dispositivo, projeto ou comando inválido.' });
          if (data.jobs.filter(j => j.status === 'pending').length >= 1000) return reply(409, { error: 'Fila cheia.' });
          const job = { id: randomBytes(12).toString('hex'), deviceId: target.id, command: { command: body.command, id: body.projectId }, status: 'pending', createdAt: new Date().toISOString() };
          data.jobs.push(job); await save(); return reply(201, job);
        }
        if (req.url === '/api/revoke' && admin) {
          data.devices = data.devices.filter(d => d.id !== body.deviceId);
          data.jobs = data.jobs.filter(j => j.deviceId !== body.deviceId);
          await save(); return reply(200, { ok: true });
        }
        if (req.url === '/api/heartbeat' && device) {
          if (body.deviceId !== device.id || !Array.isArray(body.projects) || body.projects.length > 500) return reply(400, { error: 'Dispositivo ou projetos inválidos.' });
          device.lastSeen = new Date().toISOString();
          device.projects = body.projects.map(p => ({ id: String(p.id).slice(0,80), name: String(p.name).slice(0,200), branch: String(p.branch).slice(0,200), state: String(p.state).slice(0,80), paused: Boolean(p.paused), busy: Boolean(p.busy), checkedAt: p.checkedAt }));
          await save(); return reply(200, { commands: data.jobs.filter(j => j.deviceId === device.id && j.status === 'pending').slice(0,10) });
        }
        if (req.url === '/api/ack' && device) {
          const job = data.jobs.find(j => j.id === body.id && j.deviceId === device.id);
          if (!job) return reply(404, { error: 'Solicitação não encontrada.' });
          job.status = 'completed'; job.completedAt = new Date().toISOString(); job.ok = body.ok === true;
          job.error = typeof body.error === 'string' ? body.error.slice(0,500) : undefined;
          await save(); return reply(200, { ok: true });
        }
        return reply(403, { error: 'Operação não permitida para este token.' });
      } catch { reply(500, { error: 'Falha interna do coordenador.' }); }
    };
    const pending = requests.then(handle); requests = pending.catch(() => {});
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 15000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return { server, storage, close: async () => { await new Promise(resolve => server.close(resolve)); await writes; sqliteDb?.close(); } };
}
