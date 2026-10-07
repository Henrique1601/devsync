import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { checkpoint } from './checkpoint.js';
const exec = promisify(execFile);
export async function git(cwd, ...args) {
  return (await gitRaw(cwd, ...args)).trim();
}
export async function gitRaw(cwd, ...args) {
  const { stdout } = await exec('git', ['-C', cwd, ...args], {
    timeout: 60000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: 'ssh -o BatchMode=yes -o ConnectTimeout=15' }
  });
  return stdout;
}
export async function inspect(repo) {
  const branch = await git(repo.path, 'rev-parse', '--abbrev-ref', 'HEAD');
  if (branch === 'HEAD') return { branch, state: 'detached' };
  if (branch !== repo.branch) return { branch, state: 'branch-changed' };
  const dirty = Boolean(await git(repo.path, 'status', '--porcelain'));
  const upstream = await git(repo.path, 'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const [ahead, behind] = (await git(repo.path, 'rev-list', '--left-right', '--count', 'HEAD...@{u}')).split(/\s+/).map(Number);
  const gitdir = await git(repo.path, 'rev-parse', '--absolute-git-dir');
  let operation = false;
  for (const name of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'BISECT_LOG']) {
    try { await access(path.join(gitdir, name)); operation = true; } catch {}
  }
  return { branch, dirty, upstream, ahead, behind, operation,
    state: operation ? 'operation' : branch !== repo.branch ? 'branch-changed' : dirty ? 'dirty' : ahead && behind ? 'diverged' : ahead ? 'ahead' : behind ? 'behind' : 'synced' };
}
export async function synchronize(repo) {
  const activity = { receivedCommits: 0, sentCommits: 0, checkpointCreated: false };
  if (repo.paused) return { state: 'paused', ...activity };
  // The directory lock also serializes separate DevSync processes on this clone.
  const common = await git(repo.path, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  const lock = path.join(common, 'devsync.lock');
  try { await mkdir(lock); } catch (error) {
    if (error.code === 'EEXIST') return { state: 'busy', ...activity };
    throw error;
  }
  try {
    let status = await inspect(repo);
    if (await checkpoint(repo, status)) { activity.checkpointCreated = true; status = await inspect(repo); }
    if (['dirty', 'branch-changed', 'detached', 'operation'].includes(status.state)) return { ...status, ...activity };
    const remote = await git(repo.path, 'config', '--get', `branch.${repo.branch}.remote`);
    const target = await git(repo.path, 'config', '--get', `branch.${repo.branch}.merge`);
    if (!remote || remote === '.' || remote.startsWith('-') || !target.startsWith('refs/heads/')) throw new Error('Configure um upstream remoto válido.');
    await git(repo.path, 'fetch', '--', remote);
    status = await inspect(repo);
    if (['dirty', 'branch-changed', 'detached', 'operation', 'diverged'].includes(status.state)) return { ...status, ...activity };
    if (status.behind) {
      // Git checks the worktree again; no stash, reset, force push or automatic merge.
      await git(repo.path, 'merge', '--ff-only', '@{u}');
      activity.receivedCommits = status.behind;
    }
    status = await inspect(repo);
    if (repo.autoPush && status.state === 'ahead') {
      await git(repo.path, 'push', '--', remote, `HEAD:${target}`);
      activity.sentCommits = status.ahead;
    }
    return { ...await inspect(repo), ...activity };
  } catch (error) {
    error.activity = activity;
    throw error;
  } finally { await rm(lock, { recursive: true, force: true }); }
}
