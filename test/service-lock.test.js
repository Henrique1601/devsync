import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, utimes, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { acquireServiceLock } from '../src/service-lock.js';

async function fixture(t) {
  const home=await mkdtemp(path.join(os.tmpdir(),'devsync-lock-'));t.after(()=>rm(home,{recursive:true,force:true}));return home;
}
async function old(lock) {const date=new Date(Date.now()-10000);await utimes(lock,date,date);}
test('service lock never replaces a live owner',async t=>{
  const home=await fixture(t);const lock=await acquireServiceLock(home);await old(lock);await assert.rejects(acquireServiceLock(home),/serviço ativo/);
});
test('service lock recovers a confirmed dead legacy process',async t=>{
  const home=await fixture(t);const child=spawn(process.execPath,['-e','process.exit(0)']);const pid=child.pid;await once(child,'exit');
  const lock=path.join(home,'daemon.lock');await mkdir(lock);await writeFile(path.join(home,'runtime.json'),JSON.stringify({pid}));await old(lock);
  assert.equal(await acquireServiceLock(home),lock);await assert.rejects(acquireServiceLock(home));
});
test('service lock preserves unidentified and freshly starting instances',async t=>{
  const home=await fixture(t);const lock=path.join(home,'daemon.lock');await mkdir(lock);await old(lock);await assert.rejects(acquireServiceLock(home),/origem/);
});
