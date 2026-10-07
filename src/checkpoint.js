import { git } from './git.js';
const quiet = new Map();

// Checkpoints only include tracked files. New files require an explicit git add.
export async function checkpoint(repo, status) {
  if (!repo.checkpoint || status.state !== 'dirty' || status.operation || status.branch !== repo.branch) return false;
  if (status.ahead && status.behind) return false;
  const changed = await git(repo.path, 'diff', '--name-only', '-z', 'HEAD');
  if (!changed) return false;
  const files = changed.split('\0').filter(Boolean);
  const blocked = /(^|[\/\\])(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx)|credentials(?:\..*)?|id_rsa|id_ed25519)$/i;
  if (files.some(file => blocked.test(file))) throw new Error('Checkpoint bloqueado: arquivo sensível alterado. Revise e faça o commit manualmente.');
  const fingerprint = await git(repo.path, 'diff', 'HEAD', '--', '.');
  const previous = quiet.get(repo.path);
  if (!previous || previous.fingerprint !== fingerprint) quiet.set(repo.path, { fingerprint, since: Date.now() });
  const delay = repo.checkpointDelayMs ?? 60000;
  if (Date.now() - quiet.get(repo.path).since < delay) return false;
  await git(repo.path, 'commit', '-a', '-m', `DevSync checkpoint ${new Date().toISOString()}`);
  quiet.delete(repo.path);
  return true;
}
