import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { git, predictConflicts } from '../src/git.js';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'devsync-conflict-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git'), a = path.join(root, 'work'), b = path.join(root, 'home');
  await git(root, 'init', '--bare', remote);
  await git(root, 'clone', remote, a);
  await git(a, 'config', 'user.email', 'test@example.test');
  await git(a, 'config', 'user.name', 'Test');
  await git(a, 'checkout', '-b', 'main');
  await writeFile(path.join(a, 'hello.txt'), 'line 1\nline 2\n');
  await git(a, 'add', '.');
  await git(a, 'commit', '-m', 'Initial');
  await git(a, 'push', '-u', 'origin', 'main');
  await git(root, '--git-dir', remote, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  await git(root, 'clone', '-b', 'main', remote, b);
  await git(b, 'config', 'user.email', 'test@example.test');
  await git(b, 'config', 'user.name', 'Test');
  const repo = { path: b, branch: 'main' };
  return { root, a, b, repo };
}

test('predictConflicts reports synced when both match', async t => {
  const f = await fixture(t);
  const result = await predictConflicts(f.repo);
  assert.equal(result.possible, true);
  assert.equal(result.conflicts.length, 0);
  assert.match(result.message, /sincronizado/i);
});

test('predictConflicts detects clean fast-forward behind', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.a, 'remote.txt'), 'from work');
  await git(f.a, 'add', '.');
  await git(f.a, 'commit', '-m', 'Work change');
  await git(f.a, 'push');
  await git(f.b, 'fetch');

  const result = await predictConflicts(f.repo);
  assert.equal(result.possible, true);
  assert.equal(result.conflicts.length, 0);
  assert.match(result.message, /avanço direto/i);
});

test('predictConflicts predicts conflicts when both branches edit same file divergently', async t => {
  const f = await fixture(t);
  // Commit on work (a)
  await writeFile(path.join(f.a, 'hello.txt'), 'work conflict line\n');
  await git(f.a, 'add', '.');
  await git(f.a, 'commit', '-m', 'Work change');
  await git(f.a, 'push');

  // Commit on home (b)
  await writeFile(path.join(f.b, 'hello.txt'), 'home conflict line\n');
  await git(f.b, 'add', '.');
  await git(f.b, 'commit', '-m', 'Home change');
  await git(f.b, 'fetch');

  const result = await predictConflicts(f.repo);
  assert.equal(result.possible, false);
  assert.ok(result.conflicts.length >= 1);
  assert.equal(result.conflicts[0].file, 'hello.txt');
  assert.match(result.message, /Conflito previsto em 1 arquivo/);
  assert.ok(result.preview.includes('<<<<<<<'));
});
