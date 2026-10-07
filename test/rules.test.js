import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRules, rulesFor, matchesInclude, isSyncDue } from '../src/rules.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('project rules retain defaults and enforce timing and safe patterns',()=>{
  assert.deepEqual(rulesFor({}),{syncIntervalSeconds:30,checkpointDelaySeconds:60,checkpointInclude:['**']});
  assert.equal(validateRules({syncIntervalSeconds:15,checkpointDelaySeconds:30,checkpointInclude:['src/**/*.js']}).syncIntervalSeconds,15);
  for(const syncIntervalSeconds of [14,3601,1.5,'30'])assert.throws(()=>validateRules({syncIntervalSeconds}));
  for(const checkpointDelaySeconds of [29,3601])assert.throws(()=>validateRules({checkpointDelaySeconds}));
  for(const pattern of ['../x','/x','C:/x',':(top)**','src/../x','!secret','src\\*.js','**\0'])assert.throws(()=>validateRules({checkpointInclude:[pattern]}));
  assert.throws(()=>validateRules({checkpointInclude:[]}));
  assert.ok(matchesInclude('src/a/b.js',['src/**/*.js']));assert.ok(matchesInclude('src/a.js',['src/**/*.js']));
  assert.ok(!matchesInclude('docs/a.js',['src/**/*.js']));
  assert.ok(isSyncDue({syncIntervalSeconds:15},100,15100));assert.ok(!isSyncDue({syncIntervalSeconds:15},100,15099));
});

test('wildcard matching completes adversarial patterns within a bounded child process',async()=>{
  const moduleUrl=new URL('../src/rules.js',import.meta.url).href;
  const script=`import { matchesInclude } from ${JSON.stringify(moduleUrl)}; console.log(matchesInclude('a'.repeat(80), ['*a'.repeat(22)+'b']));`;
  const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',script],{timeout:1500});
  assert.equal(result.stdout.trim(),'false');
  assert.ok(matchesInclude('a/b/c.js',['**/?.js']));assert.ok(!matchesInclude('a/b/c.js',['a/*.js']));
});
