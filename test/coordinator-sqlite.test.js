import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCoordinator } from '../src/coordinator.js';

test('coordinator works with sqlite storage engine', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-coord-sqlite-'));
  const adminToken = 's'.repeat(64);
  const coordinator = await createCoordinator({ directory, adminToken, port: 0, storage: 'sqlite' });
  t.after(async () => {
    await coordinator.close();
    await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  });

  const url = `http://127.0.0.1:${coordinator.server.address().port}`;
  const pairRes = await fetch(`${url}/api/pair`, {
    method: 'POST',
    headers: { authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Trabalho PC' })
  });
  assert.equal(pairRes.status, 201);
  const paired = await pairRes.json();
  assert.equal(paired.name, 'Trabalho PC');

  // Verify devices list via admin
  const devRes = await fetch(`${url}/api/devices`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.equal(devRes.status, 200);
  const devices = await devRes.json();
  assert.equal(devices.devices.length, 1);
  assert.equal(devices.devices[0].name, 'Trabalho PC');
});
