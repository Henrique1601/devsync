import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heuristicMerge, resolveConflictAI } from '../src/ai.js';

test('heuristicMerge integrates non-overlapping additions and removes conflict markers', () => {
  const ours = `import express from 'express';\nconst PORT = 3000;\nconsole.log('Local starting');\napp.listen(PORT);`;
  const theirs = `import express from 'express';\nconst PORT = 8080;\nconsole.log('Remote starting');\napp.listen(PORT);`;

  const res = heuristicMerge(ours, theirs);
  assert.equal(res.resolved, true);
  assert.equal(res.mode, 'heuristic');
  assert.equal(res.strategy, 'heuristic');
  assert.ok(typeof res.code === 'string');
  assert.ok(typeof res.resolvedCode === 'string');
  assert.ok(res.code.includes('import express'));
  assert.ok(res.code.includes('app.listen(PORT);'));
  assert.ok(res.code.includes('Local starting'));
  assert.ok(res.code.includes('Remote starting'));
});

test('resolveConflictAI falls back to heuristic merge when GEMINI_API_KEY is unset', async () => {
  const origKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const res = await resolveConflictAI({
      file: 'test.js',
      ours: 'const a = 1;',
      theirs: 'const b = 2;'
    });

    assert.equal(res.resolved, true);
    assert.equal(res.mode, 'heuristic');
    assert.equal(res.strategy, 'heuristic');
    assert.ok(res.code.includes('const a = 1;'));
    assert.ok(res.code.includes('const b = 2;'));
  } finally {
    if (origKey) process.env.GEMINI_API_KEY = origKey;
  }
});
