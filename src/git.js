import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { checkpoint, SENSITIVE_FILE_PATTERN } from './checkpoint.js';
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
export async function inspectDiff(repo) {
  const status = await inspect(repo);
  const porcelain = await gitRaw(repo.path, 'status', '--porcelain', '-uall');
  const files = [];
  for (const line of porcelain.split(/\r?\n/).filter(Boolean)) {
    const code = line.slice(0, 2).trim() || '?';
    const rawPath = line.slice(3).trim().replace(/^"(.*)"$/, '$1');
    const filePath = rawPath.includes(' -> ') ? rawPath.split(' -> ').pop() : rawPath;
    const sensitive = SENSITIVE_FILE_PATTERN.test(filePath);
    files.push({ status: code, path: filePath, sensitive });
  }
  const safeFiles = files.filter(f => !f.sensitive && f.status !== '??').map(f => f.path);
  const stat = safeFiles.length ? await git(repo.path, '--literal-pathspecs', 'diff', '--stat', 'HEAD', '--', ...safeFiles).catch(() => '') : '';
  const rawDiff = safeFiles.length ? await gitRaw(repo.path, '--literal-pathspecs', 'diff', 'HEAD', '--', ...safeFiles).catch(() => '') : '';
  const commits = (status.ahead || status.behind)
    ? (await git(repo.path, 'log', '--left-right', '--oneline', '-n', '15', 'HEAD...@{u}').catch(() => '')).split(/\r?\n/).filter(Boolean)
    : [];
  return {
    ...status,
    files,
    stat,
    diff: rawDiff.length > 32768 ? rawDiff.slice(0, 32768) + '\n... [diff truncado em 32 KB]' : rawDiff,
    commits
  };
}
export async function stashAndSync(repo, { pop = true } = {}) {
  const status = await inspect(repo);
  if (['branch-changed', 'detached', 'operation'].includes(status.state)) {
    throw new Error('Não é possível usar Stash seguro durante operação Git ativa, HEAD destacado ou branch diferente da cadastrada.');
  }
  let stashCreated = false;
  if (status.dirty) {
    const hasSensitive = (await inspectDiff(repo)).files.some(f => f.sensitive);
    if (hasSensitive) throw new Error('Stash bloqueado: há arquivos sensíveis modificados (.env, chaves ou credenciais). Trate-os manualmente.');
    const label = `DevSync safe stash ${new Date().toISOString()}`;
    await git(repo.path, 'stash', 'push', '--include-untracked', '-m', label);
    stashCreated = true;
  }
  const result = await synchronize({ ...repo, paused: false });
  let stashPopped = false;
  let stashConflict = false;
  if (stashCreated && pop && ['synced', 'ahead'].includes(result.state)) {
    try {
      await git(repo.path, 'stash', 'pop');
      stashPopped = true;
    } catch {
      stashConflict = true;
    }
  }
  const finalStatus = await inspect(repo);
  return {
    ...result,
    ...finalStatus,
    stashCreated,
    stashPopped,
    stashConflict,
    message: stashConflict
      ? 'Sincronização concluída, mas reaplicar o Stash gerou conflito. Suas alterações continuam salvas no git stash.'
      : stashCreated && !stashPopped
        ? 'Alterações guardadas no git stash. Resolva o estado do repositório antes de reaplicá-las.'
        : undefined
  };
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
    await git(repo.path, 'fetch', '--tags', '--', remote);
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
      if (repo.syncTags) {
        await git(repo.path, 'push', '--tags', '--', remote).catch(() => {});
      }
      activity.sentCommits = status.ahead;
    }
    return { ...await inspect(repo), ...activity };
  } catch (error) {
    error.activity = activity;
    throw error;
  } finally { await rm(lock, { recursive: true, force: true }); }
}

export async function predictConflicts(repo) {
  const status = await inspect(repo);
  if (!status.upstream) return { possible: true, conflicts: [], message: 'Upstream não configurado.' };
  if (!status.ahead && !status.behind) return { possible: true, conflicts: [], message: 'Repositório sincronizado com o upstream.' };
  if (!status.ahead && status.behind) return { possible: true, conflicts: [], message: 'Avanço direto (fast-forward) limpo, sem nenhum conflito.' };
  if (status.ahead && !status.behind) return { possible: true, conflicts: [], message: 'Commits locais prontos para envio (push).' };

  try {
    const base = await git(repo.path, 'merge-base', 'HEAD', '@{u}');
    const treeOutput = await gitRaw(repo.path, 'merge-tree', base, 'HEAD', '@{u}');
    const conflicts = [];
    const lines = treeOutput.split(/\r?\n/);
    let inConflict = false;
    const previewLines = [];

    for (const line of lines) {
      const match = line.match(/^\s*(?:base|our|their)\s+\d+\s+[a-f0-9]+\s+(.+)$/);
      if (match) {
        const fileName = match[1].trim();
        if (fileName && !conflicts.some(c => c.file === fileName)) {
          conflicts.push({ file: fileName, details: 'Alterado em ambos os lados' });
        }
      } else if (line.startsWith('conflict in ')) {
        const fileName = line.slice('conflict in '.length).trim();
        if (fileName && !conflicts.some(c => c.file === fileName)) {
          conflicts.push({ file: fileName, details: line });
        }
      } else if (line.includes('<<<<<<<')) {
        inConflict = true;
        if (previewLines.length < 30) previewLines.push(line);
      } else if (inConflict) {
        if (previewLines.length < 30) previewLines.push(line);
        if (line.includes('>>>>>>>')) inConflict = false;
      }
    }

    return {
      possible: conflicts.length === 0,
      conflicts,
      preview: previewLines.join('\n'),
      message: conflicts.length === 0
        ? 'Divergência pode ser reconciliada automaticamente sem conflitos de linhas.'
        : `Conflito previsto em ${conflicts.length} arquivo(s): ${conflicts.map(c => c.file).join(', ')}.`
    };
  } catch (error) {
    return { possible: false, conflicts: [], message: 'Previsão indisponível: ' + error.message };
  }
}

