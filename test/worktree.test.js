import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listWorktrees, syncBranchWorktree } from '../src/worktree.js';
import { gitRaw } from '../src/git.js';

const execFileAsync = promisify(execFile);

test('listWorktrees identifies existing worktrees', async t => {
  const repoDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-wt-list-'));
  t.after(() => rm(repoDir, { recursive: true, force: true }));

  await execFileAsync('git', ['init', '-b', 'main'], { cwd: repoDir });
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: repoDir });
  await execFileAsync('git', ['config', 'user.email', 'tester@devsync.local'], { cwd: repoDir });
  await writeFile(path.join(repoDir, 'file.txt'), 'hello\n', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: repoDir });
  await execFileAsync('git', ['commit', '-m', 'chore: init'], { cwd: repoDir });

  const list = await listWorktrees(repoDir);
  assert.ok(Array.isArray(list));
  assert.equal(list.length, 1);
  assert.equal(list[0].branch, 'main');
});

test('syncBranchWorktree fast-forwards a secondary branch without switching main worktree', async t => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-wt-sync-'));
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const bareDir = path.join(tempDir, 'bare.git');
  const clone1 = path.join(tempDir, 'clone1');
  const clone2 = path.join(tempDir, 'clone2');

  // 1. Create bare repo
  await mkdir(bareDir, { recursive: true });
  await execFileAsync('git', ['init', '--bare', '-b', 'main'], { cwd: bareDir });

  // 2. Clone to clone1, create main and feature branches, and push both
  await execFileAsync('git', ['clone', bareDir, clone1]);
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: clone1 });
  await execFileAsync('git', ['config', 'user.email', 'tester@devsync.local'], { cwd: clone1 });
  await writeFile(path.join(clone1, 'main.txt'), 'main\n');
  await execFileAsync('git', ['add', '.'], { cwd: clone1 });
  await execFileAsync('git', ['commit', '-m', 'chore: init main'], { cwd: clone1 });
  await execFileAsync('git', ['push', 'origin', 'main'], { cwd: clone1 });

  await execFileAsync('git', ['checkout', '-b', 'feature-sync'], { cwd: clone1 });
  await writeFile(path.join(clone1, 'feature.txt'), 'feat v1\n');
  await execFileAsync('git', ['add', '.'], { cwd: clone1 });
  await execFileAsync('git', ['commit', '-m', 'feat: feature initial'], { cwd: clone1 });
  await execFileAsync('git', ['push', 'origin', 'feature-sync'], { cwd: clone1 });

  // 3. Clone to clone2
  await execFileAsync('git', ['clone', bareDir, clone2]);
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: clone2 });
  await execFileAsync('git', ['config', 'user.email', 'tester@devsync.local'], { cwd: clone2 });
  // clone2 stays on 'main'

  // 4. In clone1, push another commit to feature-sync
  await writeFile(path.join(clone1, 'feature.txt'), 'feat v2\n');
  await execFileAsync('git', ['commit', '-am', 'feat: update feature'], { cwd: clone1 });
  await execFileAsync('git', ['push', 'origin', 'feature-sync'], { cwd: clone1 });

  // 5. In clone2 (which is on main branch), sync 'feature-sync' using syncBranchWorktree
  const syncResult = await syncBranchWorktree({ path: clone2 }, 'feature-sync');

  assert.equal(syncResult.synced, true);
  assert.equal(syncResult.updated, true);
  assert.equal(syncResult.branch, 'feature-sync');

  // Verify clone2 is STILL on main branch
  const currentBranch = (await gitRaw(clone2, 'branch', '--show-current')).trim();
  assert.equal(currentBranch, 'main');

  // Verify feature-sync in clone2 now has the latest commit
  const featureHead = (await gitRaw(clone2, 'rev-parse', 'refs/heads/feature-sync')).trim();
  const remoteFeatureHead = (await gitRaw(clone1, 'rev-parse', 'refs/heads/feature-sync')).trim();
  assert.equal(featureHead, remoteFeatureHead);
});
