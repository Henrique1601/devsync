import { rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { git, gitRaw } from './git.js';

export async function listWorktrees(repoPath) {
  try {
    const raw = await gitRaw(repoPath, 'worktree', 'list', '--porcelain');
    const worktrees = [];
    let current = {};
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.slice(9).trim() };
      } else if (line.startsWith('branch ')) {
        current.branch = line.slice(7).trim().replace('refs/heads/', '');
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice(5).trim();
      }
    }
    if (current.path) worktrees.push(current);
    return worktrees;
  } catch {
    return [];
  }
}

export async function syncBranchWorktree(repo, targetBranch) {
  if (!targetBranch || typeof targetBranch !== 'string') {
    throw new Error('Informe a branch para sincronização via worktree.');
  }

  // Worktree directory isolated inside .devsync folder in temp or repo
  const worktreeDir = path.resolve(repo.path, '.devsync', 'worktrees', targetBranch.replace(/[^a-zA-Z0-9_\-]/g, '_'));
  await mkdir(path.dirname(worktreeDir), { recursive: true });

  let headBefore = null;
  let headAfter = null;
  let receivedCommits = 0;

  try {
    // 1. Fetch the target branch from origin first
    await git(repo.path, 'fetch', 'origin', targetBranch);
  } catch (error) {
    throw new Error(`Falha ao buscar branch '${targetBranch}' do origin: ${error.message}`);
  }

  try {
    try {
      headBefore = (await gitRaw(repo.path, 'rev-parse', `refs/heads/${targetBranch}`)).trim();
    } catch {
      // Branch might not exist locally yet
    }

    const upstreamHead = (await gitRaw(repo.path, 'rev-parse', `origin/${targetBranch}`)).trim();

    if (headBefore === upstreamHead) {
      return {
        branch: targetBranch,
        synced: true,
        updated: false,
        head: headBefore,
        message: `A branch '${targetBranch}' já está sincronizada com origin.`
      };
    }

    // Check fast-forward relationship
    const isAncestor = await gitRaw(repo.path, 'merge-base', '--is-ancestor', headBefore || upstreamHead, upstreamHead)
      .then(() => true)
      .catch(() => false);

    if (!isAncestor) {
      return {
        branch: targetBranch,
        synced: false,
        updated: false,
        head: headBefore,
        message: `A branch '${targetBranch}' divergiu do origin; intervenção manual necessária.`
      };
    }

    // 2. Create detached worktree at the target branch
    try {
      await rm(worktreeDir, { recursive: true, force: true });
    } catch {}

    await git(repo.path, 'worktree', 'add', '--detach', worktreeDir, `origin/${targetBranch}`);

    // Update local branch ref safely
    await git(repo.path, 'branch', '-f', targetBranch, upstreamHead);

    headAfter = upstreamHead;

    if (headBefore) {
      try {
        const countRaw = await gitRaw(repo.path, 'rev-list', '--count', `${headBefore}..${headAfter}`);
        receivedCommits = Number(countRaw.trim()) || 0;
      } catch {}
    }

    return {
      branch: targetBranch,
      synced: true,
      updated: true,
      before: headBefore,
      after: headAfter,
      receivedCommits,
      message: `Branch '${targetBranch}' atualizada em background (${receivedCommits} commits recebidos).`
    };
  } finally {
    try {
      await git(repo.path, 'worktree', 'remove', '--force', worktreeDir);
      await git(repo.path, 'worktree', 'prune');
    } catch {}
    try {
      await rm(worktreeDir, { recursive: true, force: true });
    } catch {}
  }
}
