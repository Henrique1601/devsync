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
    },
    dailySummary(options) {
      return generateDailySummary(entries, options);
    },
    catchUpSummary(catchUpData, options) {
      return recordCatchUpSummary(catchUpData, options);
    }
  };
}

export async function generateDailySummary(entries, { date = new Date().toISOString().slice(0, 10), vaultPath = path.resolve(process.cwd(), 'Segundo Cerebro DevSync') } = {}) {
  const dayEntries = entries.filter(e => (e.finishedAt || e.startedAt || '').startsWith(date));
  const totalSyncs = dayEntries.filter(e => ['sync', 'stash-sync'].includes(e.action)).length;
  const receivedCommits = dayEntries.reduce((acc, e) => acc + (e.receivedCommits || 0), 0);
  const sentCommits = dayEntries.reduce((acc, e) => acc + (e.sentCommits || 0), 0);
  const checkpoints = dayEntries.filter(e => e.checkpointCreated).length;

  const projectMap = new Map();
  for (const e of dayEntries) {
    const pName = e.projectName || e.projectId || 'desconhecido';
    if (!projectMap.has(pName)) {
      projectMap.set(pName, { syncs: 0, received: 0, sent: 0, checkpoints: 0, states: new Set() });
    }
    const stat = projectMap.get(pName);
    if (['sync', 'stash-sync'].includes(e.action)) stat.syncs++;
    stat.received += e.receivedCommits || 0;
    stat.sent += e.sentCommits || 0;
    if (e.checkpointCreated) stat.checkpoints++;
    if (e.state) stat.states.add(e.state);
  }

  const projectRows = Array.from(projectMap.entries()).map(([name, s]) =>
    `| **${name}** | ${s.syncs} | ${s.received} | ${s.sent} | ${s.checkpoints} | ${Array.from(s.states).join(', ') || 'synced'} |`
  ).join('\n');

  const content = `---
tipo: diario
data: ${date}
tags: [devsync, diario, produtividade]
cssclasses: [devsync]
---
# 📅 Diário de Bordo DevSync — ${date}

## 📊 Resumo Executivo da Jornada
- **Sincronizações executadas:** ${totalSyncs}
- **Commits recebidos:** ${receivedCommits}
- **Commits enviados:** ${sentCommits}
- **Checkpoints criados:** ${checkpoints}
- **Eventos registrados:** ${dayEntries.length}

## 🔄 Atividade por Projeto

| Projeto | Sincronizações | Commits Recebidos | Commits Enviados | Checkpoints | Estados Observados |
| :--- | :---: | :---: | :---: | :---: | :--- |
${projectRows || '| *Nenhum projeto movimentado nesta data* | 0 | 0 | 0 | 0 | — |'}

## 📝 Linha do Tempo dos Eventos
${dayEntries.slice(-15).reverse().map(e => `- **${(e.finishedAt || e.startedAt || '').slice(11, 19)}** — [${e.action}] ${e.projectName || e.projectId}: ${e.reason || e.state || 'concluído'}`).join('\n') || '- Nenhum evento registrado.'}

← [[00 Comece aqui]]
`;

  const targetDir = path.join(vaultPath, '05 Registros');
  await mkdir(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, `${date} - Resumo Diario.md`);
  await writeFile(targetFile, content, 'utf8');

  return { date, file: targetFile, totalSyncs, receivedCommits, sentCommits, checkpoints, projectsCount: projectMap.size };
}

export async function recordCatchUpSummary(catchUpData, { date = new Date().toISOString().slice(0, 10), vaultPath = path.resolve(process.cwd(), 'Segundo Cerebro DevSync') } = {}) {
  const targetDir = path.join(vaultPath, '05 Registros');
  await mkdir(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, `${date} - Resumo Diario.md`);

  let content = '';
  try {
    content = await readFile(targetFile, 'utf8');
  } catch {
    content = `---
tipo: diario
data: ${date}
tags: [devsync, diario, produtividade]
cssclasses: [devsync]
---
# 📅 Diário de Bordo DevSync — ${date}

← [[00 Comece aqui]]
`;
  }

  const pName = catchUpData.projectName || 'DevSync';
  const sectionHeader = `## 🌅 Resumo Matinal & Retomada de Contexto (${pName})`;
  const sectionBody = `${sectionHeader}
> **Resumo:** ${catchUpData.summary}

### 🔍 Principais Mudanças
${(catchUpData.highlights || []).map(h => `- ${h}`).join('\n') || '- Nenhuma alteração detectada.'}

### 📌 Pontos de Atenção & TODOs
${(catchUpData.todos || []).length ? catchUpData.todos.map(t => `- ${t}`).join('\n') : '- Nenhuma pendência crítica ou TODO detectado.'}

### 🚀 Próximo Passo Sugerido
**${catchUpData.nextStep || 'Retomar o fluxo de trabalho.'}**
*(Gerado via ${catchUpData.method === 'gemini-ai' ? 'Gemini AI' : 'Heurística Semântica'} às ${(catchUpData.timestamp || new Date().toISOString()).slice(11, 19)})*
`;

  if (content.includes(`## 🌅 Resumo Matinal & Retomada de Contexto (${pName})`)) {
    const escaped = pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`## 🌅 Resumo Matinal & Retomada de Contexto \\(${escaped}\\)[\\s\\S]*?(?=\\n## |\\n←|$)`, 'g');
    content = content.replace(regex, sectionBody + '\n');
  } else {
    const titleHeader = `# 📅 Diário de Bordo DevSync — ${date}`;
    const titleMatch = content.indexOf(titleHeader);
    if (titleMatch !== -1) {
      const insertPos = titleMatch + titleHeader.length;
      content = content.slice(0, insertPos) + '\n\n' + sectionBody + '\n' + content.slice(insertPos);
    } else {
      content = sectionBody + '\n\n' + content;
    }
  }

  await writeFile(targetFile, content, 'utf8');
  return { file: targetFile, date, projectName: pName };
}


