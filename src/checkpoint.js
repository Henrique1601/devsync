import { createHash } from 'node:crypto';
import { git, gitRaw } from './git.js';
import { rulesFor, matchesInclude } from './rules.js';
import { scanDiff } from './secrets.js';
const quiet = new Map();

export const SENSITIVE_FILE_PATTERN = /(^|[\/\\])(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|.*\.(?:pem|key|p12|pfx)|(?:credentials|secrets|tokens)(?:\..*)?|id_(?:rsa|ed25519|ecdsa|dsa)|\.(?:ssh|aws)(?:[\/\\].*)?)$/i;

export function formatCheckpointMessage(files, timestamp = new Date().toISOString()) {
  const names = files.slice(0, 3).join(', ');
  const extra = files.length > 3 ? ` +${files.length - 3}` : '';
  return `DevSync checkpoint: ${names}${extra} (${timestamp})`;
}

// Checkpoints only include tracked files. New files require an explicit git add.
export async function checkpoint(repo, status) {
  if (!repo.checkpoint || status.state !== 'dirty' || status.operation || status.branch !== repo.branch) return false;
  if (status.ahead && status.behind) return false;
  const changed = await gitRaw(repo.path, 'diff', '--name-only', '--no-renames', '-z', 'HEAD');
  if (!changed) return false;
  const tracked = new Set((await gitRaw(repo.path, 'ls-tree', '-r', '--name-only', '-z', 'HEAD')).split('\0'));
  const files = changed.split('\0').filter(file => file && tracked.has(file) && matchesInclude(file, rulesFor(repo).checkpointInclude));
  if (!files.length) { quiet.delete(repo.path); return false; }
  if (files.some(file => SENSITIVE_FILE_PATTERN.test(file))) throw new Error('Checkpoint bloqueado: arquivo sensível alterado. Revise e faça o commit manualmente.');
  const diffText = await gitRaw(repo.path, '--literal-pathspecs', 'diff', 'HEAD', '--', ...files);
  const secretScan = scanDiff(diffText);
  if (!secretScan.safe) {
    const leakDesc = secretScan.leaks.map(l => `${l.type} em ${l.file}`).join(', ');
    throw new Error(`Checkpoint bloqueado: segredo detectado (${leakDesc}). Revise antes de commitar.`);
  }
  const fingerprint = createHash('sha256').update(diffText).digest('hex');
  const previous = quiet.get(repo.path);
  if (!previous || previous.fingerprint !== fingerprint) quiet.set(repo.path, { fingerprint, since: Date.now() });
  const delay = repo.checkpointDelayMs ?? rulesFor(repo).checkpointDelaySeconds * 1000;
  if (Date.now() - quiet.get(repo.path).since < delay) return false;
  await git(repo.path, '--literal-pathspecs', 'commit', '--only', '-m', formatCheckpointMessage(files), '--', ...files);
  quiet.delete(repo.path);
  return true;
}
