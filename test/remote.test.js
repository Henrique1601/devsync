import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createCoordinator } from '../src/coordinator.js';
import { startRemote, validateRemote } from '../src/remote-client.js';

test('remote pairing, authentication, offline queue persistence, command delivery and revoke', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'devsync-remote-'));
  let server = await createCoordinator({directory,adminToken:'a'.repeat(64),port:0});
  t.after(async()=>{await server.close();await rm(directory,{recursive:true,force:true,maxRetries:3,retryDelay:50})});
  let url=`http://127.0.0.1:${server.server.address().port}`;
  async function request(route,token,body) { return fetch(url+'/api/'+route,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}); }
  assert.equal((await request('devices','wrong')).status,401);
  const pairing=await (await request('pair','a'.repeat(64),{name:'Casa'})).json();
  assert.equal((await request('devices',pairing.token)).status,404);
  await request('heartbeat',pairing.token,{deviceId:pairing.deviceId,projects:[{id:'project',name:'CRM',branch:'main',state:'synced',path:'SECRET_LOCAL_PATH'}]});
  const devices=await (await request('devices','a'.repeat(64))).json();
  assert.equal(devices.devices[0].token,undefined);assert.equal(devices.devices[0].projects[0].path,undefined);
  assert.equal((await request('queue','a'.repeat(64),{deviceId:pairing.deviceId,projectId:'project',command:'push-on'})).status,400);
  const job=await (await request('queue','a'.repeat(64),{deviceId:pairing.deviceId,projectId:'project',command:'pause'})).json();
  assert.equal(job.status,'pending');
  await server.close();server=await createCoordinator({directory,adminToken:'a'.repeat(64),port:0});url=`http://127.0.0.1:${server.server.address().port}`;
  const executed=[];
  const settings=validateRemote({url,token:pairing.token,deviceId:pairing.deviceId,name:'Casa'});
  const client=startRemote(()=>settings,()=>[{id:'project',name:'CRM',state:'synced',branch:'main'}],async command=>executed.push(command));
  t.after(()=>client.stop());await client.poll();await client.stop();
  assert.deepEqual(executed,[{command:'pause',id:'project'}]);assert.equal(client.status().connected,true);
  const completed=await (await request('devices','a'.repeat(64))).json();assert.equal(completed.jobs[0].status,'completed');assert.equal(completed.jobs[0].ok,true);
  await request('revoke','a'.repeat(64),{deviceId:pairing.deviceId});assert.equal((await request('heartbeat',pairing.token,{deviceId:pairing.deviceId,projects:[]})).status,401);
});
test('remote configuration requires HTTPS outside localhost and explicit device ID',()=>{
  const base={token:'a'.repeat(64),deviceId:'123456789012345678901234'};
  assert.throws(()=>validateRemote({...base,url:'http://example.com'}),/HTTPS/);
  assert.throws(()=>validateRemote({...base,url:'https://user:pass@example.com'}),/endereço base/);
  assert.throws(()=>validateRemote({...base,url:'https://example.com',deviceId:''}),/ID/);
  assert.equal(validateRemote({...base,url:'https://example.com'}).url,'https://example.com');
});

test('public health exposes only liveness while devices remain private', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-health-'));
  const adminToken = 's'.repeat(64);
  const coordinator = await createCoordinator({ directory, adminToken, port: 0 });
  t.after(async () => { await coordinator.close(); await rm(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${coordinator.server.address().port}`;
  await fetch(url + '/api/pair', { method: 'POST', headers: { authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ name: 'Private PC' }) });
  const response = await fetch(url + '/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal((await fetch(url + '/api/devices')).status, 401);
});

test('HTTPS proxy uses preserved Host and rejects foreign or malformed origins', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-proxy-'));
  const coordinator = await createCoordinator({ directory, adminToken: 'a'.repeat(64), port: 0 });
  t.after(async () => { await coordinator.close(); await rm(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${coordinator.server.address().port}/api/devices`;
  const headers = { authorization: 'Bearer ' + 'a'.repeat(64), host: 'devsync.example.com' };
  // Use the raw HTTP client to model a reverse proxy retaining Host. fetch
  // implementations may forbid overriding that header.
  const status = origin => new Promise((resolve, reject) => {
    http.get(url, { headers: { ...headers, origin, 'x-forwarded-host': 'foreign.example.com' } }, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  assert.equal(await status('https://devsync.example.com'), 200);
  for (const origin of ['https://foreign.example.com', 'null', 'not-an-origin']) {
    assert.equal(await status(origin), 403);
  }
});

test('oversized bodies are rejected and health stays responsive during slow uploads', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-limit-'));
  const coordinator = await createCoordinator({ directory, adminToken: 'a'.repeat(64), port: 0 });
  t.after(async () => { await coordinator.close(); await rm(directory, { recursive: true, force: true }); });
  const url = `http://127.0.0.1:${coordinator.server.address().port}`;
  const headers = { authorization: 'Bearer ' + 'a'.repeat(64) };
  const oversized = await fetch(url + '/api/pair', { method: 'POST', headers, body: JSON.stringify({ name: 'x'.repeat(262144) }) });
  assert.equal(oversized.status, 413);
  const slow = http.request(url + '/api/pair', { method: 'POST', headers: { ...headers, 'content-length': '1000' } });
  slow.on('error', () => {});
  slow.flushHeaders();
  t.after(() => slow.destroy());
  try {
    const response = await fetch(url + '/api/health', { signal: AbortSignal.timeout(2000) });
    assert.deepEqual(await response.json(), { ok: true });
  } finally { slow.destroy(); }
});
