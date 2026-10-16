import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { git, inspectDiff, stashAndSync } from '../src/git.js';
import { formatCheckpointMessage } from '../src/checkpoint.js';

async function repoFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'devsync-diff-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git');
  const a = path.join(root, 'work');
  const b = path.join(root, 'home');
  await git(root, 'init', '--bare', remote);
  await git(root, 'clone', remote, a);
  await git(a, 'config', 'user.email', 'test@example.test');
  await git(a, 'config', 'user.name', 'Test');
  await git(a, 'checkout', '-b', 'main');
  await writeFile(path.join(a, 'hello.txt'), 'initial\n');
  await git(a, 'add', '.');
  await git(a, 'commit', '-m', 'Initial commit');
  await git(a, 'push', '-u', 'origin', 'main');
  await git(root, '--git-dir', remote, 'symbolic-ref', 'HEAD', 'refs/heads/main');
  await git(root, 'clone', '-b', 'main', remote, b);
  await git(b, 'config', 'user.email', 'test@example.test');
  await git(b, 'config', 'user.name', 'Test');
  const repo = { path: b, branch: 'main', autoPush: false, paused: false };
  return { root, a, b, repo };
}

test('formatCheckpointMessage formats filenames cleanly', () => {
  assert.match(formatCheckpointMessage(['src/cli.js']), /^DevSync checkpoint: src\/cli\.js/);
  assert.match(formatCheckpointMessage(['a.js', 'b.js', 'c.js', 'd.js']), /\+1/);
});

test('inspectDiff lists modified files and redacts sensitive files', async t => {
  const f = await repoFixture(t);
  await writeFile(path.join(f.b, 'hello.txt'), 'modified text\n');
  await writeFile(path.join(f.b, '.env'), 'SECRET_TOKEN=12345\n');

  const diff = await inspectDiff(f.repo);
  assert.equal(diff.dirty, true);
  assert.equal(diff.branch, 'main');
  const sensitiveFile = diff.files.find(file => file.path === '.env');
  assert.ok(sensitiveFile, '.env should be listed');
  assert.equal(sensitiveFile.sensitive, true);
  assert.ok(!diff.diff.includes('SECRET_TOKEN=12345'), 'Sensitive content must not appear in raw diff');
  assert.ok(diff.diff.includes('modified text'), 'Safe file diff must be present');
});

test('stashAndSync stashes local changes, receives remote commits and pops stash', async t => {
  const f = await repoFixture(t);
  // PC A commits and pushes a change to README.md
  await writeFile(path.join(f.a, 'README.md'), 'documentation from work\n');
  await git(f.a, 'add', '.');
  await git(f.a, 'commit', '-m', 'Add README from work');
  await git(f.a, 'push');

  // PC B has local uncommitted draft in hello.txt
  await writeFile(path.join(f.b, 'hello.txt'), 'local draft before sync\n');

  // Run safe stash and sync
  const result = await stashAndSync(f.repo, { pop: true });
  assert.equal(result.stashCreated, true);
  assert.equal(result.stashPopped, true);
  assert.equal(result.receivedCommits, 1);

  // Both the pulled file and the restored draft are present!
  assert.equal((await readFile(path.join(f.b, 'README.md'), 'utf8')).trim(), 'documentation from work');
  assert.equal((await readFile(path.join(f.b, 'hello.txt'), 'utf8')).trim(), 'local draft before sync');
});
