export const defaultRules = Object.freeze({ syncIntervalSeconds: 30, checkpointDelaySeconds: 60, checkpointInclude: ['**'] });

export function rulesFor(repo) {
  return { syncIntervalSeconds: repo.syncIntervalSeconds ?? 30, checkpointDelaySeconds: repo.checkpointDelaySeconds ?? 60, checkpointInclude: repo.checkpointInclude ?? ['**'] };
}

export function validateRules(value) {
  const result = {};
  for (const [field, minimum] of [['syncIntervalSeconds', 15], ['checkpointDelaySeconds', 30]]) {
    if (value[field] === undefined) continue;
    if (!Number.isInteger(value[field]) || value[field] < minimum || value[field] > 3600) throw new Error(`${field}: informe segundos inteiros entre ${minimum} e 3600.`);
    result[field] = value[field];
  }
  if (value.checkpointInclude !== undefined) {
    const patterns = value.checkpointInclude;
    if (!Array.isArray(patterns) || !patterns.length || patterns.length > 50) throw new Error('Informe de 1 a 50 padrões de arquivos para checkpoints.');
    if (patterns.some(p => typeof p !== 'string' || !p || p.length > 200 || /[\\:\x00-\x1f\x7f\[\]{}!]/.test(p) || p.startsWith('/') || p.split('/').some(segment => !segment || segment === '.' || segment === '..' || segment.toLowerCase() === '.git'))) throw new Error('Use padrões relativos à pasta do projeto, com /, *, ** ou ?, sem caminhos absolutos ou .. .');
    result.checkpointInclude = [...new Set(patterns)];
  }
  return result;
}

function globMatches(file, pattern) {
  // Prefix dynamic programming keeps even repeated overlapping wildcards bounded
  // by O(pattern.length * file.length), with no regular expression backtracking.
  let previous = new Uint8Array(file.length + 1);
  previous[0] = 1;
  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];
    let kind = character;
    if (character === '*' && pattern[i + 1] === '*') {
      i++;
      kind = 'globstar';
      if (pattern[i + 1] === '/') { kind = 'directories'; i++; }
    }
    const current = new Uint8Array(file.length + 1);
    if (['*', 'globstar', 'directories'].includes(kind)) current[0] = previous[0];
    let anyPrefix = previous[0];
    for (let j = 1; j <= file.length; j++) {
      if (kind === 'directories') current[j] = previous[j] || (file[j - 1] === '/' && anyPrefix);
      else if (kind === 'globstar' || kind === '*') current[j] = previous[j] || (current[j - 1] && (kind === 'globstar' || file[j - 1] !== '/'));
      else current[j] = previous[j - 1] && (kind === '?' ? file[j - 1] !== '/' : file[j - 1] === character);
      anyPrefix ||= previous[j];
    }
    previous = current;
  }
  return Boolean(previous[file.length]);
}

export function matchesInclude(file, patterns) { return patterns.some(pattern => globMatches(file, pattern)); }
export function isSyncDue(repo, lastRun, now = Date.now()) { return lastRun === undefined || now - lastRun >= rulesFor(repo).syncIntervalSeconds * 1000; }
