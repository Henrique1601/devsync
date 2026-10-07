import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, mkdir, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { git, synchronize } from '../src/git.js';
import { createCoordinator } from '../src/coordinator.js';
import { diagnose } from '../src/onboarding.js';
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'devsync-test-'));
  t.after(() => rm(root, { recursive:true, force:true }));
  const remote=path.join(root,'remote.git'), a=path.join(root,'work'), b=path.join(root,'home');
  await git(root,'init','--bare',remote); await git(root,'clone',remote,a);
  await git(a,'config','user.email','test@example.test');await git(a,'config','user.name','Test');
  await git(a,'checkout','-b','main');await writeFile(path.join(a,'hello.txt'),'initial\n');
  await git(a,'add','.');await git(a,'commit','-m','Initial');await git(a,'push','-u','origin','main');
  await git(root,'--git-dir',remote,'symbolic-ref','HEAD','refs/heads/main');
  await git(root,'clone','-b','main',remote,b);await git(b,'config','user.email','test@example.test');await git(b,'config','user.name','Test');
  const repo={path:b,branch:'main',autoPush:false,paused:false};
  async function commit(cwd,text){await writeFile(path.join(cwd,'hello.txt'),text);await git(cwd,'add','.');await git(cwd,'commit','-m',text)}
  return {root,a,b,repo,commit};
}
test('receives committed changes from the other PC',async t=>{const f=await fixture(t);await f.commit(f.a,'work update');await git(f.a,'push');assert.equal((await synchronize(f.repo)).state,'synced');assert.equal(await readFile(path.join(f.b,'hello.txt'),'utf8'),'work update')});
test('dirty tracked files are preserved',async t=>{const f=await fixture(t);await writeFile(path.join(f.b,'hello.txt'),'unsent');assert.equal((await synchronize(f.repo)).state,'dirty');assert.equal(await readFile(path.join(f.b,'hello.txt'),'utf8'),'unsent')});
test('untracked files pause sync',async t=>{const f=await fixture(t);await writeFile(path.join(f.b,'new.txt'),'draft');assert.equal((await synchronize(f.repo)).state,'dirty')});
test('divergence preserves both histories',async t=>{const f=await fixture(t);await f.commit(f.a,'work');await git(f.a,'push');await f.commit(f.b,'home');const before=await git(f.b,'rev-parse','HEAD');assert.equal((await synchronize(f.repo)).state,'diverged');assert.equal(await git(f.b,'rev-parse','HEAD'),before)});
test('push is disabled until explicitly enabled',async t=>{const f=await fixture(t);await f.commit(f.b,'home');assert.equal((await synchronize(f.repo)).state,'ahead');assert.equal((await synchronize({...f.repo,autoPush:true})).state,'synced');await git(f.a,'pull','--ff-only');assert.equal(await readFile(path.join(f.a,'hello.txt'),'utf8'),'home')});
test('paused project is untouched',async t=>{const f=await fixture(t);assert.equal((await synchronize({...f.repo,paused:true})).state,'paused')});
test('changed branch pauses sync',async t=>{const f=await fixture(t);await git(f.b,'checkout','-b','feature');assert.equal((await synchronize(f.repo)).state,'branch-changed')});
test('repository lock blocks duplicate operations',async t=>{const f=await fixture(t);await mkdir(path.join(f.b,'.git','devsync.lock'));assert.equal((await synchronize(f.repo)).state,'busy')});
test('detached HEAD pauses sync',async t=>{const f=await fixture(t);await git(f.b,'checkout','--detach');assert.equal((await synchronize(f.repo)).state,'detached')});
test('ongoing Git operation pauses sync',async t=>{const f=await fixture(t);await writeFile(path.join(f.b,'.git','MERGE_HEAD'),await git(f.b,'rev-parse','HEAD'));assert.equal((await synchronize(f.repo)).state,'operation')});
test('opt-in checkpoint commits tracked changes but preserves untracked drafts',async t=>{
  const f=await fixture(t);await writeFile(path.join(f.b,'hello.txt'),'checkpoint');await writeFile(path.join(f.b,'draft.txt'),'private draft');
  await synchronize({...f.repo,checkpoint:true,checkpointDelayMs:0});
  assert.match(await git(f.b,'log','-1','--format=%s'),/^DevSync checkpoint/);
  assert.equal(await git(f.b,'show','HEAD:hello.txt'),'checkpoint');
  assert.match(await git(f.b,'status','--porcelain'),/draft.txt/);
  assert.equal(await git(f.b,'rev-list','--count','origin/main..HEAD'),'1');
});
test('checkpoint does not commit during divergence or active Git operation',async t=>{
  const f=await fixture(t);await f.commit(f.a,'work');await git(f.a,'push');await git(f.b,'fetch');await f.commit(f.b,'home');await writeFile(path.join(f.b,'hello.txt'),'draft');
  const before=await git(f.b,'rev-parse','HEAD');await synchronize({...f.repo,checkpoint:true,checkpointDelayMs:0});assert.equal(await git(f.b,'rev-parse','HEAD'),before);
});
test('checkpoint blocks sensitive tracked files and waits for quiet time',async t=>{
  const f=await fixture(t);await writeFile(path.join(f.b,'hello.txt'),'draft');await synchronize({...f.repo,checkpoint:true});assert.equal(await git(f.b,'rev-list','--count','origin/main..HEAD'),'0');
  await writeFile(path.join(f.b,'.env'),'SECRET=old');await git(f.b,'add','.env');await git(f.b,'commit','-m','fixture');await writeFile(path.join(f.b,'.env'),'SECRET=new');
  const before=await git(f.b,'rev-parse','HEAD');await assert.rejects(synchronize({...f.repo,checkpoint:true,checkpointDelayMs:0}),/arquivo sensível/);assert.equal(await git(f.b,'rev-parse','HEAD'),before);
});

test('checkpoint allowlist excludes unrelated staged and untracked files',async t=>{
  const f=await fixture(t);
  await writeFile(path.join(f.b,'other.txt'),'base');await git(f.b,'add','other.txt');await git(f.b,'commit','-m','setup');
  await writeFile(path.join(f.b,'hello.txt'),'allowed');await writeFile(path.join(f.b,'other.txt'),'staged');await git(f.b,'add','other.txt');
  await writeFile(path.join(f.b,'draft.txt'),'untracked');await git(f.b,'add','draft.txt');
  await synchronize({...f.repo,checkpoint:true,checkpointDelayMs:0,checkpointInclude:['hello.txt']});
  assert.equal(await git(f.b,'show','HEAD:hello.txt'),'allowed');assert.equal(await git(f.b,'show','HEAD:other.txt'),'base');
  assert.match(await git(f.b,'diff','--cached','--name-only'),/other.txt/);assert.match(await git(f.b,'diff','--cached','--name-only'),/draft.txt/);
  await assert.rejects(git(f.b,'show','HEAD:draft.txt'));
});

test('sync reports received and sent commit counts',async t=>{
  const f=await fixture(t);await f.commit(f.a,'received');await git(f.a,'push');
  const received=await synchronize(f.repo);assert.equal(received.receivedCommits,1);assert.equal(received.sentCommits,0);
  await f.commit(f.b,'sent');const sent=await synchronize({...f.repo,autoPush:true});assert.equal(sent.sentCommits,1);
});

test('onboarding reports missing upstream, identity and detached HEAD without modifying Git',async t=>{
  const f=await fixture(t), before=await git(f.b,'rev-parse','HEAD');
  await git(f.b,'branch','--unset-upstream');await git(f.b,'config','user.name','');
  const missing=await diagnose(f.b);assert.equal(missing.ready,false);assert.equal(missing.upstream,null);assert.equal(missing.identity.nameConfigured,false);
  assert.ok(missing.checks.find(check=>check.id==='upstream').guidance.includes('--set-upstream-to'));
  await git(f.b,'checkout','--detach');const detached=await diagnose(f.b);assert.equal(detached.branch,null);assert.equal(detached.ready,false);
  assert.equal(await git(f.b,'rev-parse','HEAD'),before);
  assert.equal((await diagnose(f.root)).repository,false);assert.equal((await diagnose('https://github.com/a/b.git')).pathValid,false);
});
test('daemon API and CLI: authentication, add, status, pause, shutdown',async t=>{
  const f=await fixture(t), home=path.join(f.root,'config');
  const child=spawn(process.execPath,['src/cli.js','daemon'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,DEVSYNC_HOME:home,GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:`url.${new URL('file:///' + path.join(f.root,'remote.git').replaceAll('\\','/')).href}.insteadOf`,GIT_CONFIG_VALUE_0:'https://github.com/example/test.git'},stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',c=>stderr+=c);
  t.after(()=>child.kill('SIGTERM'));
  let runtime;
  for(let i=0;i<100;i++){try{runtime=JSON.parse(await readFile(path.join(home,'runtime.json'),'utf8'));break}catch{}if(child.exitCode!==null)throw Error(stderr);await new Promise(r=>setTimeout(r,50))}
  assert.ok(runtime,'daemon started');const url=`http://127.0.0.1:${runtime.port}`;
  assert.equal((await fetch(url+'/api/status')).status,401);
  const headers={authorization:`Bearer ${runtime.token}`,'Content-Type':'application/json'};
  assert.equal((await fetch(url+'/api/status',{headers:{...headers,origin:'https://evil.test'}})).status,403);
  async function command(body){const r=await fetch(url+'/api/command',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(r.status,200);return r.json()}
  async function rejected(body, message) {
    const r=await fetch(url+'/api/command',{method:'POST',headers,body:JSON.stringify(body)});
    assert.equal(r.status,400);assert.match((await r.json()).error,message);
  }
  await rejected(null,/Parâmetros/);
  await rejected({command:'add'},/Informe o caminho/);
  await rejected({command:'add',path:path.join(f.root,'missing')},/Pasta não encontrada/);
  await rejected({command:'add',path:f.root},/repositório Git/);
  await git(f.b,'branch','--unset-upstream');
  await rejected({command:'add',path:f.b},/não tem upstream/);
  assert.equal((await (await fetch(url+'/api/status',{headers})).json()).projects.length,0);
  await git(f.b,'branch','--set-upstream-to=origin/main');
  const added=await command({command:'add',path:f.b});await command({command:'pause',id:added.project.id});
  const diagnostics=await command({command:'diagnose',path:f.b});
  assert.equal(diagnostics.ready,true);assert.equal(diagnostics.identity.nameConfigured,true);assert.equal(diagnostics.identity.name,undefined);
  assert.equal((await command({command:'diagnose',path:path.join(f.root,'missing')})).pathValid,false);
  await command({command:'settings',id:added.project.id,syncIntervalSeconds:120,checkpointDelaySeconds:90,checkpointInclude:['hello.txt']});
  await rejected({command:'settings',id:added.project.id,syncIntervalSeconds:1},/15/);
  await rejected({command:'settings',id:added.project.id,checkpointInclude:['../private']},/relativos/);
  const journal=await (await fetch(url+'/api/history?projectId='+added.project.id+'&limit=2',{headers})).json();
  assert.equal(journal.entries.length,2);assert.equal(journal.entries[0].action,'settings');assert.equal(journal.entries[0].source,'manual');
  assert.ok(journal.entries.every(entry=>entry.projectId===added.project.id));
  assert.equal((await fetch(url+'/api/history?limit=0',{headers})).status,400);
  assert.equal((await fetch(url+'/api/history')).status,401);
  await rejected({command:'add',path:f.b},/já cadastrado/);
  await rejected({command:'add',path:'https://github.com/example/test.git'},/pasta local/);
  await rejected({command:'clone',url:'file:///untrusted',path:path.join(f.root,'clone')},/HTTPS/);
  const cloned=await command({command:'clone',url:'https://github.com/example/test.git',path:path.join(f.root,'clone')});assert.equal(cloned.project.name,'clone');
  await rejected({command:'clone',url:'https://github.com/example/test.git',path:path.join(f.root,'clone')},/já existe/);
  await command({command:'checkpoint-on',id:added.project.id});await command({command:'checkpoint-off',id:added.project.id});
  const status=await (await fetch(url+'/api/status',{headers})).json();assert.equal(status.projects[0].paused,true);
  assert.equal(status.projects[0].syncIntervalSeconds,120);assert.deepEqual(status.projects[0].checkpointInclude,['hello.txt']);
  const cli=await promisify(execFile)(process.execPath,['src/cli.js','status'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,DEVSYNC_HOME:home}});
  assert.equal(JSON.parse(cli.stdout).projects[0].id,added.project.id);
  const coordinator=await createCoordinator({directory:path.join(f.root,'coordinator'),adminToken:'a'.repeat(64),port:0});t.after(()=>coordinator.close());
  const remoteUrl=`http://127.0.0.1:${coordinator.server.address().port}`;
  const adminHeaders={authorization:'Bearer '+'a'.repeat(64),'Content-Type':'application/json'};
  const pairing=await (await fetch(remoteUrl+'/api/pair',{method:'POST',headers:adminHeaders,body:JSON.stringify({name:'Casa'})})).json();
  await command({command:'remote-config',settings:{url:remoteUrl,token:pairing.token,deviceId:pairing.deviceId,name:'Casa'}});
  async function waitForRemote(check) {
    for(let i=0;i<400;i++){const snapshot=await (await fetch(remoteUrl+'/api/devices',{headers:adminHeaders})).json();if(check(snapshot))return snapshot;await new Promise(resolve=>setTimeout(resolve,100))}
    assert.fail('remote state did not arrive');
  }
  await waitForRemote(s=>s.devices[0].projects.some(p=>p.id===added.project.id));
  assert.equal((await (await fetch(url+'/api/status',{headers})).json()).remote.token,undefined);
  const queued=await (await fetch(remoteUrl+'/api/queue',{method:'POST',headers:adminHeaders,body:JSON.stringify({deviceId:pairing.deviceId,projectId:added.project.id,command:'resume'})})).json();
  const delivered=await waitForRemote(s=>s.jobs.some(j=>j.id===queued.id&&j.status==='completed'));assert.equal(delivered.jobs.find(j=>j.id===queued.id).ok,true);
  assert.equal((await (await fetch(url+'/api/status',{headers})).json()).projects[0].paused,false);
  await command({command:'remote-off'});
  assert.equal((await fetch(url)).status,200);
  child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));
  // Windows terminates the child directly; it does not deliver POSIX SIGTERM.
  if (process.platform !== 'win32') await assert.rejects(readFile(path.join(home,'runtime.json')));
});
