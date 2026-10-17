export function heuristicMerge(ours, theirs, base = '') {
  const oursLines = ours.split(/\r?\n/);
  const theirsLines = theirs.split(/\r?\n/);
  const combined = [];
  const seen = new Set();

  // Combine unique lines while preserving ordering
  for (const line of oursLines) {
    combined.push(line);
    if (line.trim()) seen.add(line.trim());
  }
  for (const line of theirsLines) {
    if (!line.trim() || !seen.has(line.trim())) {
      combined.push(line);
    }
  }

  return {
    resolved: true,
    code: combined.join('\n'),
    resolvedCode: combined.join('\n'),
    mode: 'heuristic',
    strategy: 'heuristic',
    explanation: 'Mesclagem heurística: preservou as alterações locais e combinou as adições exclusivas do remoto sem duplicações.',
    localCode: ours,
    remoteCode: theirs
  };
}

export async function resolveConflictAI({ file, base = '', ours = '', theirs = '', apiKey = process.env.GEMINI_API_KEY, model = 'gemini-2.5-flash' }) {
  if (!apiKey) {
    return heuristicMerge(ours, theirs, base);
  }

  try {
    const prompt = `Você é um engenheiro de software sênior especializado em resolução de conflitos Git.
Arquivo em conflito: ${file || 'código'}

--- VERSÃO BASE (Comum):
${base || '(não disponível)'}

--- VERSÃO LOCAL (Nosso código / HEAD):
${ours}

--- VERSÃO REMOTA (Outro PC / Upstream):
${theirs}

TAREFA:
Reconcilie as duas versões em uma única versão final de código funcional e limpa.
Responda EXATAMENTE no formato JSON a seguir:
{
  "code": "código final reconciliado aqui",
  "explanation": "resumo conciso em português explicando por que esta resolução foi adotada"
}
Não inclua crases de markdown envolta do JSON, apenas o objeto JSON puro.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`API retornou status HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText.trim());

    return {
      resolved: true,
      code: parsed.code || ours,
      resolvedCode: parsed.code || ours,
      explanation: parsed.explanation || 'Reconciliação semântica gerada por IA com sucesso.',
      mode: 'ai',
      strategy: 'gemini-ai',
      localCode: ours,
      remoteCode: theirs
    };
  } catch (error) {
    // Graceful fallback to heuristic merge
    const fallback = heuristicMerge(ours, theirs, base);
    fallback.explanation += ` (IA offline: ${error.message})`;
    return fallback;
  }
}

export function heuristicCommitMessage(files = [], diffText = '') {
  if (!files.length && diffText) {
    const matches = diffText.matchAll(/diff --git a\/(.*?) b\//g);
    files = Array.from(matches, m => m[1]);
  }
  if (!files.length) return 'chore(sync): automated DevSync checkpoint';

  const basenames = files.map(f => f.split(/[/\\]/).pop());

  if (files.every(f => f.includes('test') || f.endsWith('.test.js') || f.endsWith('.spec.js'))) {
    return `test: update unit tests (${basenames.slice(0, 2).join(', ')})`;
  }
  if (files.every(f => f.endsWith('.md') || f.startsWith('docs/'))) {
    return `docs: update documentation (${basenames.slice(0, 2).join(', ')})`;
  }
  if (files.every(f => f.startsWith('ui/') || f.endsWith('.css') || f.endsWith('.html'))) {
    return `style(ui): update interface components (${basenames.slice(0, 2).join(', ')})`;
  }
  if (files.some(f => f.includes('package.json') || f.includes('config'))) {
    return 'chore(config): update configuration and dependencies';
  }
  if (diffText.includes('fix') || diffText.includes('bug') || diffText.includes('error')) {
    return `fix(core): resolve issue in ${basenames.slice(0, 2).join(', ')}`;
  }
  return `feat(core): update ${basenames.slice(0, 3).join(', ')}`;
}

export async function generateConventionalCommit(diffText = '', { files = [], apiKey = process.env.GEMINI_API_KEY, model = 'gemini-2.5-flash' } = {}) {
  if (!apiKey || !diffText) {
    return { message: heuristicCommitMessage(files, diffText), method: 'heuristic' };
  }

  try {
    const prompt = `Analise o diff Git a seguir e gere uma única mensagem concisa no padrão Conventional Commits (ex: feat(auth): add token rotation, fix(sync): prevent race condition).
Regras:
1. Comece com um dos tipos: feat, fix, refactor, docs, test, chore, perf, style.
2. Seja específico e direto em português ou inglês conforme o código.
3. Máximo de 72 caracteres no título.
4. Responda SOMENTE a mensagem do commit, sem explicações, sem aspas, sem crases de markdown.

Diff:
${diffText.slice(0, 3000)}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 60 }
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    const cleanMsg = raw.split(/\r?\n/)[0].replace(/^["'`]|["'`]$/g, '').trim();
    if (cleanMsg && cleanMsg.length >= 6) {
      return { message: cleanMsg, method: 'ai' };
    }
    return { message: heuristicCommitMessage(files, diffText), method: 'heuristic' };
  } catch {
    return { message: heuristicCommitMessage(files, diffText), method: 'heuristic' };
  }
}

export function heuristicCatchUpSummary({ project = {}, commits = [], diffText = '', todos = [] } = {}) {
  const pName = project.name || project.id || 'Projeto';
  const foundTodos = [...todos];

  if (!foundTodos.length && diffText) {
    const todoMatches = diffText.matchAll(/(?:^[+]|[+]\s*)(?:(?:\/\/|#|\/\*)\s*(?:TODO|FIXME|HACK):?\s*)([^\r\n]+)/gmi);
    for (const m of todoMatches) {
      if (m[1] && m[1].trim()) foundTodos.push(m[1].trim());
      if (foundTodos.length >= 5) break;
    }
  }

  const commitList = Array.isArray(commits) ? commits : [];
  const highlights = [];

  if (commitList.length) {
    for (const c of commitList.slice(0, 3)) {
      const clean = typeof c === 'string' ? c.replace(/^[0-9a-f]+\s+/, '') : (c.message || '');
      if (clean) highlights.push(clean);
    }
  } else {
    highlights.push('Sincronização recente em dia sem novos commits.');
  }

  let summary = `Você sincronizou ${commitList.length || 0} commit(s) recente(s) no projeto ${pName}.`;
  if (commitList.some(c => String(c).includes('feat:'))) {
    summary = `Novas funcionalidades foram adicionadas em ${pName} durante a sessão anterior.`;
  } else if (commitList.some(c => String(c).includes('fix:'))) {
    summary = `Correções de bugs e ajustes foram aplicados em ${pName}.`;
  }

  let nextStep = 'Revisar os arquivos alterados e retomar o desenvolvimento.';
  if (foundTodos.length > 0) {
    nextStep = `Resolver a pendência: "${foundTodos[0]}".`;
  } else if (commitList.some(c => String(c).toLowerCase().includes('test'))) {
    nextStep = 'Executar a suíte de testes unitários para validar as alterações.';
  } else if (diffText.includes('package.json')) {
    nextStep = 'Verificar se há novas dependências para instalar (npm install).';
  }

  return {
    projectName: pName,
    summary,
    highlights,
    todos: foundTodos,
    nextStep,
    method: 'heuristic',
    timestamp: new Date().toISOString()
  };
}

export async function generateCatchUpSummary({ project = {}, commits = [], diffText = '', todos = [], apiKey = process.env.GEMINI_API_KEY, model = 'gemini-2.5-flash' } = {}) {
  if (!apiKey) {
    return heuristicCatchUpSummary({ project, commits, diffText, todos });
  }

  try {
    const pName = project.name || project.id || 'Projeto';
    const prompt = `Você é o assistente executivo matinal do DevSync. O desenvolvedor acabou de ligar o computador (Casa ou Trabalho) e recebeu atualizações do outro computador.
Projeto: ${pName}
Commits recebidos:
${commits.slice(0, 5).map(c => `- ${typeof c === 'string' ? c : c.message}`).join('\n') || '- Nenhum commit explícito'}

Diff resumido:
${(diffText || '').slice(0, 3500)}

TODOs pendentes encontrados:
${todos.slice(0, 5).map(t => `- ${t}`).join('\n') || '- Nenhum TODO detectado'}

TAREFA:
Gere um briefing executivo matinal em português no formato JSON estrito:
{
  "summary": "Resumo de 1-2 frases do que foi codificado no outro computador",
  "highlights": ["ponto importante 1", "ponto importante 2"],
  "todos": ["pendência 1 se houver"],
  "nextStep": "Próxima ação prática imediata recomendada para iniciar o trabalho"
}
Não inclua crases markdown envolta do JSON.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText.trim());

    return {
      projectName: pName,
      summary: parsed.summary || `Sessão anterior sincronizada para ${pName}.`,
      highlights: parsed.highlights || [],
      todos: parsed.todos?.length ? parsed.todos : todos,
      nextStep: parsed.nextStep || 'Iniciar verificando os testes e branch atual.',
      method: 'gemini-ai',
      timestamp: new Date().toISOString()
    };
  } catch {
    return heuristicCatchUpSummary({ project, commits, diffText, todos });
  }
}


