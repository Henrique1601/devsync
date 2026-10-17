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

test('generateDailySummary compiles history entries into Obsidian daily log markdown', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-history-vault-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const history = await createHistory({ directory });
  const today = new Date().toISOString().slice(0, 10);

  await history.append({
    projectId: 'crm',
    projectName: 'Meu CRM',
    startedAt: today + 'T10:00:00.000Z',
    finishedAt: today + 'T10:00:02.000Z',
    action: 'sync',
    state: 'synced',
    receivedCommits: 3,
    sentCommits: 2,
    checkpointCreated: true,
    reason: 'Sincronizado perfeitamente.'
  });

  const vaultPath = path.join(directory, 'vault');
  const result = await history.dailySummary({ vaultPath, date: today });

  assert.equal(result.date, today);
  assert.equal(result.totalSyncs, 1);
  assert.equal(result.receivedCommits, 3);
  assert.equal(result.sentCommits, 2);
  assert.equal(result.checkpoints, 1);

  const fileContent = await readFile(result.file, 'utf8');
  assert.match(fileContent, /# 📅 Diário de Bordo DevSync/);
  assert.match(fileContent, /Meu CRM/);
  assert.match(fileContent, /Sincronizações executadas:\*\* 1/);
});

