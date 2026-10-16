const SECRET_RULES = [
  {
    type: 'Chave Privada',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i
  },
  {
    type: 'Token GitHub',
    pattern: /(?:ghp_[A-Za-z0-9_]{30,}|gho_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{22,})/
  },
  {
    type: 'Chave de Acesso AWS',
    pattern: /AKIA[0-9A-Z]{16}/
  },
  {
    type: 'Chave Google / Gemini API',
    pattern: /AIza[0-9A-Za-z\-_]{35}/
  },
  {
    type: 'Chave OpenAI API',
    pattern: /sk-(?:proj-)?[a-zA-Z0-9\-_]{20,}/
  },
  {
    type: 'Chave Anthropic API',
    pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/
  },
  {
    type: 'Token ou Webhook Slack',
    pattern: /(?:xox[baprs]-[0-9]{10,}-[a-zA-Z0-9]{24,}|https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8,}\/B[0-9A-Z]{8,}\/[0-9a-zA-Z]{24,})/
  },
  {
    type: 'Webhook Discord com Token',
    pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9_\-]{60,}/
  },
  {
    type: 'Credencial em Texto Puro',
    pattern: /(?:password|passwd|api_key|apikey|auth_token|client_secret)\s*[:=]\s*['"][a-zA-Z0-9_\-@#$%^&*!]{8,}['"]/i
  }
];

export function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return '';
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '...' + secret.slice(-4);
}

export function scanContent(content, filename = '') {
  // Allow example and mock files
  const lower = filename.toLowerCase();
  if (lower.endsWith('.example') || lower.endsWith('.sample') || lower.includes('.test.') || lower.includes('.spec.')) {
    return { safe: true, leaks: [] };
  }

  const leaks = [];
  const lines = (content || '').split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) continue;

    for (const rule of SECRET_RULES) {
      const match = rule.pattern.exec(line);
      if (match) {
        leaks.push({
          type: rule.type,
          line: i + 1,
          preview: maskSecret(match[0]),
          file: filename
        });
      }
    }
  }

  return {
    safe: leaks.length === 0,
    leaks
  };
}

export function scanDiff(diffText) {
  const leaks = [];
  const lines = (diffText || '').split(/\r?\n/);
  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim();
      continue;
    }
    // Only analyze added lines, ignoring header lines (+++, @@)
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    const addedContent = line.slice(1);

    const lower = currentFile.toLowerCase();
    if (lower.endsWith('.example') || lower.endsWith('.sample') || lower.includes('.test.') || lower.includes('.spec.')) {
      continue;
    }

    for (const rule of SECRET_RULES) {
      const match = rule.pattern.exec(addedContent);
      if (match) {
        leaks.push({
          type: rule.type,
          file: currentFile || 'desconhecido',
          preview: maskSecret(match[0])
        });
      }
    }
  }

  return {
    safe: leaks.length === 0,
    leaks
  };
}
