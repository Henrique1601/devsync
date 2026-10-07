import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { home } from './store.js';

export const stateReasons = {
  synced: 'Projeto atualizado com a branch remota.', dirty: 'Alterações locais aguardam um commit ou checkpoint permitido.',
  diverged: 'Históricos divergentes: resolva manualmente pelo Git.', ahead: 'Commits locais aguardam envio; confira o envio automático.',
  behind: 'Há commits remotos para receber.', paused: 'Sincronização pausada pelo usuário.', busy: 'Outra operação está usando este repositório.',
  detached: 'Selecione uma branch: HEAD está destacado.', 'branch-changed': 'A branch atual difere da branch cadastrada.',
  operation: 'Finalize a operação Git em andamento.', error: 'Falha no Git: confira rede, credenciais, identidade e upstream.', pending: 'Aguardando primeira verificação.'
};

export function historySnapshot(status = {}) {
  return { state: status.state || 'pending', head: /^[a-f0-9]{40,64}$/.test(status.head || '') ? status.head : null,
    ahead: Number.isInteger(status.ahead) ? status.ahead : null, behind: Number.isInteger(status.behind) ? status.behind : null };
}

export async function createHistory({ directory = home, maxEntries = 1000 } = {}) {
  const filename = path.join(directory, 'history.json');
  let entries;
  try { entries = JSON.parse(await readFile(filename, 'utf8')); if (!Array.isArray(entries)) throw new Error('Histórico inválido.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; entries = []; }
  entries = entries.slice(-maxEntries);
  let pending = Promise.resolve();
  return {
    append(value) {
      const operation = pending.then(async () => {
        // Explicit projection keeps file contents, paths, credentials and command payloads out of the journal.
        const entry = { id: randomUUID(), projectId: value.projectId, projectName: String(value.projectName || '').slice(0, 100),
          startedAt: value.startedAt, finishedAt: value.finishedAt, source: value.source, action: value.action,
          state: value.state, reason: value.reason, before: historySnapshot(value.before), after: historySnapshot(value.after),
          receivedCommits: value.receivedCommits || 0, sentCommits: value.sentCommits || 0, checkpointCreated: Boolean(value.checkpointCreated) };
        const updated = [...entries, entry].slice(-maxEntries);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const temporary = `${filename}.${process.pid}.tmp`;
        await writeFile(temporary, JSON.stringify(updated), { mode: 0o600 }); await rename(temporary, filename);
        entries = updated;
        return entry;
      });
      pending = operation.catch(() => {});
      return operation;
    },
    query({ projectId, limit = 100 } = {}) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Limite do histórico deve ser inteiro entre 1 e 1000.');
      const matching = entries.filter(entry => !projectId || entry.projectId === projectId);
      return { entries: matching.slice(-limit).reverse(), total: matching.length };
    }
  };
}
