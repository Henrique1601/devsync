import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHistory } from '../src/history.js';

test('history survives restart, limits size, filters projects and omits payload secrets',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'devsync-history-'));t.after(()=>rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:100}));
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

test('catchUpSummary injects and updates morning catch-up section in Obsidian daily note', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-history-catchup-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const history = await createHistory({ directory });
  const today = new Date().toISOString().slice(0, 10);
  const vaultPath = path.join(directory, 'vault');

  const catchUpData = {
    projectName: 'API Gateway',
    summary: 'Sincronizados 3 novos endpoints de autenticação e logs.',
    highlights: ['feat(auth): token rotation', 'fix: rate limiting'],
    todos: ['TODO: add integration test for redis cache'],
    nextStep: 'Adicionar teste de integração para o cache Redis.',
    method: 'heuristic',
    timestamp: new Date().toISOString()
  };

  const res = await history.catchUpSummary(catchUpData, { vaultPath, date: today });
  assert.equal(res.projectName, 'API Gateway');
  assert.equal(res.date, today);

  let fileContent = await readFile(res.file, 'utf8');
  assert.match(fileContent, /## 🌅 Resumo Matinal & Retomada de Contexto \(API Gateway\)/);
  assert.match(fileContent, /Sincronizados 3 novos endpoints/);
  assert.match(fileContent, /TODO: add integration test/);
  assert.match(fileContent, /Adicionar teste de integração/);

  // Calling it again updates the section rather than duplicating it
  catchUpData.summary = 'Resumo atualizado da sessão matinal.';
  await history.catchUpSummary(catchUpData, { vaultPath, date: today });

  fileContent = await readFile(res.file, 'utf8');
  assert.match(fileContent, /Resumo atualizado da sessão matinal/);
  const occurrences = fileContent.split('## 🌅 Resumo Matinal & Retomada de Contexto (API Gateway)').length - 1;
  assert.equal(occurrences, 1);
});

test('createHistory recovers cleanly from null bytes and corrupted JSON files', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-history-corrupt-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  // Simulate NTFS zero-byte cluster corruption (file filled with \0)
  const historyPath = path.join(directory, 'history.json');
  const { writeFile, readdir } = await import('node:fs/promises');
  await writeFile(historyPath, Buffer.alloc(1024, 0)); // 1024 null bytes

  // Should NOT throw! Should quarantine corrupt file and start cleanly with []
  const history = await createHistory({ directory });
  assert.equal(history.query().total, 0);

  // A backup file .corrupt-... should have been preserved
  const files = await readdir(directory);
  assert.ok(files.some(f => f.includes('.corrupt-') && f.endsWith('.bak')));

  // Now appending works normally and writes valid JSON
  await history.append({
    projectId: 'p1',
    projectName: 'Recovery Test',
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    action: 'sync',
    state: 'synced',
    reason: 'Recuperado com sucesso.'
  });
  assert.equal(history.query().total, 1);
});

test('store read recovers cleanly from corrupted JSON and returns fallback when provided', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'devsync-store-corrupt-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const originalHome = process.env.DEVSYNC_HOME;
  process.env.DEVSYNC_HOME = directory;
  t.after(() => { process.env.DEVSYNC_HOME = originalHome; });

  const { read, write } = await import(`../src/store.js?t=${Date.now()}`);

  // Normal write and read
  await write('test.json', { a: 1 });
  const val = await read('test.json');
  assert.deepEqual(val, { a: 1 });

  // Corrupt the file with invalid syntax
  const { writeFile, readdir } = await import('node:fs/promises');
  await writeFile(path.join(directory, 'test.json'), 'Unexpected token error { invalid json');

  // Reading with fallback should NOT throw, should return fallback and quarantine corrupted file
  const fallbackVal = await read('test.json', { fallback: true });
  assert.deepEqual(fallbackVal, { fallback: true });

  const files = await readdir(directory);
  assert.ok(files.some(f => f.startsWith('test.json.corrupt-')));
});


