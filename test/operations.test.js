import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleOperations, withBusy } from '../src/operations.js';

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
