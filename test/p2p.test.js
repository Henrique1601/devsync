import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getLocalIpAddresses, createBundle, verifyAndFetchBundle, P2PManager } from '../src/p2p.js';
import { gitRaw } from '../src/git.js';

const execFileAsync = promisify(execFile);

test('getLocalIpAddresses returns array of network interfaces', () => {
  const ips = getLocalIpAddresses();
  assert.ok(Array.isArray(ips));
});

test('createBundle and verifyAndFetchBundle transfers commits directly via git bundle', async t => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'devsync-p2p-bundle-'));
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const repoSrc = path.join(tempDir, 'repo-source');
  const repoDest = path.join(tempDir, 'repo-dest');

  // Setup source repo
  await mkdir(repoSrc, { recursive: true });
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: repoSrc });
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: repoSrc });
  await execFileAsync('git', ['config', 'user.email', 'test@devsync.local'], { cwd: repoSrc });
  await writeFile(path.join(repoSrc, 'first.txt'), 'hello from p2p\n', 'utf8');
  await execFileAsync('git', ['add', '.'], { cwd: repoSrc });
  await execFileAsync('git', ['commit', '-m', 'feat: initial source commit'], { cwd: repoSrc });

  // Create destination repo
  await mkdir(repoDest, { recursive: true });
  await execFileAsync('git', ['init', '-b', 'main'], { cwd: repoDest });
  await execFileAsync('git', ['config', 'user.name', 'DevSync Tester'], { cwd: repoDest });
  await execFileAsync('git', ['config', 'user.email', 'test@devsync.local'], { cwd: repoDest });

  const bundleFile = path.join(tempDir, 'sync.bundle');
  await createBundle(repoSrc, bundleFile, 'main');

  const fetched = await verifyAndFetchBundle(repoDest, bundleFile, 'main');
  assert.equal(fetched, true);

  const destHead = (await gitRaw(repoDest, 'rev-parse', 'refs/remotes/p2p/main')).trim();
  const srcHead = (await gitRaw(repoSrc, 'rev-parse', 'refs/heads/main')).trim();
  assert.equal(destHead, srcHead);
});

test('P2PManager starts, manages peer map and shuts down cleanly', async t => {
  const manager = new P2PManager({
    deviceId: 'dev-1',
    name: 'PC Casa',
    httpPort: 48999,
    token: 'test-tok'
  });

  t.after(() => manager.stop());

  manager.start();
  assert.ok(Array.isArray(manager.getPeers()));
  assert.equal(manager.getPeers().length, 0);

  // Manually simulate receiving a peer beacon
  manager.peers.set('dev-2', {
    deviceId: 'dev-2',
    name: 'PC Trabalho',
    httpPort: 48998,
    ip: '192.168.1.150',
    lastSeen: Date.now()
  });

  const peers = manager.getPeers();
  assert.equal(peers.length, 1);
  assert.equal(peers[0].name, 'PC Trabalho');
  assert.equal(peers[0].ip, '192.168.1.150');

  manager.stop();
  assert.equal(manager.socket, null);
});
