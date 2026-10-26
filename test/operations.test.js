import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleOperations, withBusy, mapConcurrent } from '../src/operations.js';

test('one failed journal does not release the operation group before other work settles',async()=>{
  let finishSibling,settled=false;
  const sibling=new Promise(resolve=>finishSibling=resolve);
  const drain=settleOperations([Promise.reject(new Error('journal failed')),sibling]).catch(error=>{settled=true;assert.equal(error.message,'journal failed')});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  finishSibling();await drain;assert.equal(settled,true);
});

test('busy stays set until the journal finishes and releases after failure',async()=>{
  const busy=new Set();let finishJournal;
  const operation=withBusy(busy,'project',async()=>{await new Promise(resolve=>finishJournal=resolve);throw new Error('write failed')});
  assert.ok(busy.has('project'));finishJournal();await assert.rejects(operation,/write failed/);assert.equal(busy.size,0);
});

test('mapConcurrent limits concurrency and preserves result ordering', async () => {
  let active = 0;
  let maxActive = 0;
  const tasks = [1, 2, 3, 4, 5].map(val => async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 15));
    active--;
    return val * 10;
  });
  const results = await mapConcurrent(tasks, 2);
  assert.deepEqual(results, [10, 20, 30, 40, 50]);
  assert.ok(maxActive <= 2, `Expected maxActive <= 2 but got ${maxActive}`);
});