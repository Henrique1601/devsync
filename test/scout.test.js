import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { scoutRepositories } from '../src/scout.js';

const execFileAsync = promisify(execFile);

async function initRepo(repoPath, branch = 'main') {
  await mkdir(repoPath, { recursive: true });
  await execFileAsync('git', ['init', '-b', branch], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: repoPath });
  await execFileAsync('git', ['config', 'user.email', 'test@devsync.local'], { cwd: repoPath });
  await writeFile(path.join(repoPath, 'README.md'), '# Initial Repo\n', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: repoPath });
  await execFileAsync('git', ['commit', '-m', 'chore: initial commit'], { cwd: repoPath });
}

test('scoutRepositories recursively discovers git repos, detecting dirty state and existing registrations', async t => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-scout-'));
  t.after(() => rm(baseDir, { recursive: true, force: true }));

  const repo1 = path.join(baseDir, 'work', 'project-one');
  const repo2 = path.join(baseDir, 'personal', 'project-two');

  await initRepo(repo1, 'main');
  await initRepo(repo2, 'feature-x');

  // Make repo2 dirty
  await writeFile(path.join(repo2, 'extra.txt'), 'dirty work\n', 'utf8');

  // Also create a non-git directory that should be ignored
  await mkdir(path.join(baseDir, 'random-folder'), { recursive: true });

  const result = await scoutRepositories({
    rootDir: baseDir,
    maxDepth: 3,
    existingPaths: [repo1]
  });

  assert.equal(result.count, 2);
  assert.equal(result.registered, 1);

  const found1 = result.repositories.find(r => r.name === 'project-one');
  const found2 = result.repositories.find(r => r.name === 'project-two');

  assert.ok(found1, 'project-one should be found');
  assert.ok(found2, 'project-two should be found');

  assert.equal(found1.alreadyRegistered, true);
  assert.equal(found1.isDirty, false);
  assert.equal(found1.branch, 'main');

  assert.equal(found2.alreadyRegistered, false);
  assert.equal(found2.isDirty, true);
  assert.equal(found2.branch, 'feature-x');
});
