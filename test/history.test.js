import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHistory } from '../src/history.js';

test('history survives restart, limits size, filters projects and omits payload secrets',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'devsync-history-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const history=await createHistory({directory,maxEntries:3});
  for(let i=0;i<5;i++)await history.append({projectId:i%2?'a':'b',projectName:'Test',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString(),source:'manual',action:'sync',state:'synced',reason:'Atualizado.',token:'private',fileContent:'private'});
  const reopened=await createHistory({directory,maxEntries:3});
  assert.equal(reopened.query().total,3);assert.equal(reopened.query({projectId:'a'}).total,1);
  assert.equal(reopened.query({limit:1}).entries.length,1);assert.doesNotMatch(await readFile(path.join(directory,'history.json'),'utf8'),/private/);
  assert.throws(()=>reopened.query({limit:0}));assert.throws(()=>reopened.query({limit:1001}));
});
