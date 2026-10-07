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
  else if (command === 'help') console.log(`DevSync 0.3 — Node.js 22+ e Git

  devsync daemon                         Inicia serviço local
  devsync add <pasta>                     Cadastra clone com upstream
  devsync clone <url-github> <nova-pasta>  Clona e cadastra um projeto
  devsync status                         Exibe projetos e conexão remota
  devsync history [id] [limite]           Exibe histórico persistente
  devsync diagnose <pasta>               Verifica Git e configuração
  devsync settings <id> <intervalo> <espera> <padrões separados por vírgula>
  devsync sync <id>                       Sincroniza agora
  devsync pause <id> / resume <id>        Pausa ou retoma automação
  devsync push-on <id> / push-off <id>    Controla envio automático
  devsync checkpoint-on <id>              Autoriza commits automáticos
  devsync checkpoint-off <id>             Desativa commits automáticos
  devsync remote-config <url> <token> <device-id> <nome>
  devsync remote-off                     Desconecta painel remoto
  devsync dashboard                      Exibe endereço do painel
  devsync coordinator                    Inicia coordenador remoto

Aplicativo desktop: npm run desktop
Instalador Windows: npm run dist
Checkpoints e envio são optativos e começam desativados.`);
  else {
    const runtime = await read('runtime.json');
    const url = `http://127.0.0.1:${runtime.port}`;
    if (command === 'dashboard') console.log(`${url}/#${runtime.token}`);
    else {
      const readonly = ['status', 'history'].includes(command);
      const route = command === 'history' ? 'history?' + new URLSearchParams({ ...(argument ? { projectId: argument } : {}), ...(extra ? { limit: extra } : {}) }) : command === 'status' ? 'status' : 'command';
      const payload = command === 'clone' ? { command, url: argument, path: extra } : command === 'remote-config' ? { command, settings: { url: argument, token: extra, deviceId, name } } : command === 'settings' ? { command, id: argument, ...(extra === undefined ? {} : { syncIntervalSeconds: Number(extra) }), ...(deviceId === undefined ? {} : { checkpointDelaySeconds: Number(deviceId) }), ...(name === undefined ? {} : { checkpointInclude: name.split(',').map(value => value.trim()) }) } : { command, path: argument, id: argument };
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
