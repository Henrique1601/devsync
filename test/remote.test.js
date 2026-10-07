import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCoordinator } from '../src/coordinator.js';
import { startRemote, validateRemote } from '../src/remote-client.js';

test('remote pairing, authentication, offline queue persistence, command delivery and revoke', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'devsync-remote-'));
  let server = await createCoordinator({directory,adminToken:'a'.repeat(64),port:0});
  t.after(async()=>{await server.close();await rm(directory,{recursive:true,force:true})});
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
