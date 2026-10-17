import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { gitRaw } from './git.js';

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'target', 'vendor',
  'AppData', 'bin', 'obj', '.cache', '.npm', '.cargo', '.vscode',
  '.idea', 'temp', 'tmp'
]);

export async function inspectScoutedRepo(repoPath, existingPaths = new Set()) {
  const norm = path.resolve(repoPath).toLowerCase();
  const name = path.basename(repoPath);
  let branch = 'main';
  let remoteUrl = null;
  let dirtyCount = 0;

  try {
    const rawBranch = await gitRaw(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD');
    branch = rawBranch.trim() || 'main';
  } catch {}

  try {
    const rawRemote = await gitRaw(repoPath, 'config', '--get', 'remote.origin.url');
    remoteUrl = rawRemote.trim() || null;
  } catch {}

  try {
    const status = await gitRaw(repoPath, 'status', '--porcelain=v1');
    dirtyCount = status.split(/\r?\n/).filter(line => line.trim().length > 0).length;
  } catch {}

  const isRegistered = existingPaths.has(norm);
  const isDirty = dirtyCount > 0;

  return {
    path: repoPath,
    name,
    branch,
    remoteUrl,
    hasRemote: Boolean(remoteUrl),
    dirty: isDirty,
    isDirty,
    dirtyCount,
    registered: isRegistered,
    alreadyRegistered: isRegistered
  };
}

export async function scoutRepositories(rootDirOrOptions, maybeOptions = {}) {
  let rootDir = rootDirOrOptions;
  let options = maybeOptions;
  if (typeof rootDirOrOptions === 'object' && rootDirOrOptions !== null) {
    rootDir = rootDirOrOptions.rootDir;
    options = rootDirOrOptions;
  }
  if (!rootDir || typeof rootDir !== 'string') {
    rootDir = process.cwd();
  }

  const maxDepth = options.maxDepth ?? 4;
  const rawExisting = options.existingPaths || [];
  const normalizedExisting = new Set(Array.from(rawExisting).map(p => path.resolve(typeof p === 'string' ? p : p.path).toLowerCase()));
  const repos = [];

  async function walk(currentDir, currentDepth) {
    if (currentDepth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasGit = entries.some(e => e.isDirectory() && e.name === '.git');
    if (hasGit) {
      const info = await inspectScoutedRepo(currentDir, normalizedExisting);
      repos.push(info);
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (IGNORED_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith('.')) continue;

      const subPath = path.join(currentDir, entry.name);
      await walk(subPath, currentDepth + 1);
    }
  }

  await walk(path.resolve(rootDir), 0);

  Object.assign(repos, {
    rootDir,
    count: repos.length,
    registered: repos.filter(r => r.alreadyRegistered).length,
    repositories: repos,
    repos
  });

  return repos;
}
