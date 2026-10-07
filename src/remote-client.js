import { randomUUID } from 'node:crypto';

export function validateRemote(value) {
  if (!value || typeof value.url !== 'string' || typeof value.token !== 'string' || value.token.length < 32) throw new Error('Informe o endereço do servidor e um token de dispositivo válido.');
  if (typeof value.deviceId !== 'string' || !/^[a-zA-Z0-9-]{12,80}$/.test(value.deviceId)) throw new Error('Informe o ID gerado pelo painel remoto.');
  const url = new URL(value.url);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use apenas o endereço base do servidor.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) throw new Error('O servidor remoto precisa usar HTTPS. HTTP é permitido apenas em localhost.');
  return { url: url.origin, token: value.token, deviceId: value.deviceId || randomUUID(), name: String(value.name || 'Meu computador').slice(0, 80) };
}

export function startRemote(getSettings, getStatus, execute) {
  let running = false;
  let stopped = false;
  let lastError = null;
  let lastConnectedAt = null;
  async function request(settings, endpoint, body) {
    const response = await fetch(settings.url + endpoint, {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { authorization: `Bearer ${settings.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Servidor remoto respondeu ${response.status}. Confira endereço e token.`);
    return response.json();
  }
  async function poll() {
    const settings = getSettings();
    if (running || stopped || !settings) return;
    running = true;
    try {
      const projects = getStatus().map(({ id, name, branch, state, paused, busy, checkedAt }) => ({ id, name, branch, state, paused, busy, checkedAt }));
      const result = await request(settings, '/api/heartbeat', { deviceId: settings.deviceId, name: settings.name, projects });
      lastConnectedAt = new Date().toISOString(); lastError = null;
      for (const job of result.commands || []) {
        let outcome;
        try {
          const result = await execute(job.command);
          if (result?.state === 'error') throw new Error(result.message || 'Falha na sincronização.');
          outcome = { ok: true };
        }
        catch (error) { outcome = { ok: false, error: error.message }; }
        await request(settings, '/api/ack', { id: job.id, ...outcome });
      }
    } catch (error) { lastError = error.message; }
    finally { running = false; }
  }
  const timer = setInterval(poll, 10000);
  return { poll, status: () => ({ connected: Boolean(lastConnectedAt && !lastError), lastConnectedAt, error: lastError }), stop: async () => { stopped = true; clearInterval(timer); while (running) await new Promise(resolve => setTimeout(resolve, 50)); } };
}
