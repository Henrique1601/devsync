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

test('inspectScoutedRepo accurately inspects individual selected folders', async t => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-multi-folders-'));
  t.after(() => rm(baseDir, { recursive: true, force: true }));

  const repoA = path.join(baseDir, 'repo-alpha');
  const nonGit = path.join(baseDir, 'not-a-repo');

  await initRepo(repoA, 'main');
  await mkdir(nonGit, { recursive: true });

  const { inspectScoutedRepo } = await import('../src/scout.js');

  const inspectedA = await inspectScoutedRepo(repoA, new Set());
  assert.equal(inspectedA.name, 'repo-alpha');
  assert.equal(inspectedA.branch, 'main');
  assert.equal(inspectedA.registered, false);

  // A non-git folder throws when inspecting git properties, handled gracefully by callers
  await assert.rejects(async () => {
    await inspectScoutedRepo(nonGit, new Set());
  });
});

test('multi-folder selection inspects multiple specific paths correctly', async t => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-multi-select-'));
  t.after(() => rm(baseDir, { recursive: true, force: true }));

  const repo1 = path.join(baseDir, 'pkg-1');
  const repo2 = path.join(baseDir, 'pkg-2');
  const nonRepo = path.join(baseDir, 'plain-docs');

  await initRepo(repo1, 'main');
  await initRepo(repo2, 'dev');
  await mkdir(nonRepo, { recursive: true });

  const { inspectScoutedRepo } = await import('../src/scout.js');
  const existing = new Set([path.resolve(repo1).toLowerCase()]);

  // Simulating daemon handling of paths
  const paths = [repo1, repo2, nonRepo];
  const repos = [];
  for (const p of paths) {
    try {
      const info = await inspectScoutedRepo(p, existing);
      repos.push(info);
    } catch (err) {
      repos.push({ path: p, name: path.basename(p), hasGit: false, error: err.message, alreadyRegistered: false });
    }
  }

  assert.equal(repos.length, 3);
  assert.equal(repos[0].alreadyRegistered, true);
  assert.equal(repos[0].name, 'pkg-1');
  assert.equal(repos[1].alreadyRegistered, false);
  assert.equal(repos[1].branch, 'dev');
  assert.equal(repos[2].hasGit, false);
});

