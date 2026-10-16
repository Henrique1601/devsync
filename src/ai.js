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
