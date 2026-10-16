import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMetrics } from '../src/metrics.js';

test('calculateMetrics calculates summaries, hours saved and distributions', () => {
  const projects = [
    { id: 'proj1', name: 'Frontend React', state: 'synced' },
    { id: 'proj2', name: 'Backend API', state: 'synced' }
  ];

  const now = new Date().toISOString();
  const entries = [
    { action: 'sync', state: 'synced', projectId: 'proj1', receivedCommits: 3, sentCommits: 1, finishedAt: now },
    { action: 'sync', state: 'ahead', projectId: 'proj1', receivedCommits: 0, sentCommits: 2, finishedAt: now },
    { action: 'stash-sync', state: 'synced', projectId: 'proj2', receivedCommits: 4, sentCommits: 0, checkpointCreated: true, finishedAt: now },
    { action: 'sync', state: 'error', projectId: 'proj2', receivedCommits: 0, sentCommits: 0, finishedAt: now },
    { action: 'settings', state: 'synced', projectId: 'proj1', finishedAt: now } // Should be ignored
  ];

  const metrics = calculateMetrics(entries, projects);

  assert.equal(metrics.summary.totalSyncs, 4);
  assert.equal(metrics.summary.successRate, 75); // 3 out of 4 successful
  assert.equal(metrics.summary.totalReceivedCommits, 7);
  assert.equal(metrics.summary.totalSentCommits, 3);
  assert.equal(metrics.summary.checkpointsCreated, 1);
  assert.ok(Number(metrics.summary.estimatedHoursSaved) > 0);

  // 7 days breakdown
  assert.equal(metrics.days.length, 7);
  const todayKey = now.slice(0, 10);
  const todayStat = metrics.days.find(d => d.date === todayKey);
  assert.ok(todayStat);
  assert.equal(todayStat.count, 4);
  assert.equal(todayStat.received, 7);
  assert.equal(todayStat.sent, 3);

  // Projects breakdown
  assert.equal(metrics.projects.length, 2);
  const p1 = metrics.projects.find(p => p.id === 'proj1');
  assert.equal(p1.syncs, 2);
  assert.equal(p1.received, 3);
  assert.equal(p1.sent, 3);
});

test('calculateMetrics handles empty entries gracefully', () => {
  const metrics = calculateMetrics([], []);
  assert.equal(metrics.summary.totalSyncs, 0);
  assert.equal(metrics.summary.successRate, 100);
  assert.equal(metrics.summary.totalReceivedCommits, 0);
  assert.equal(metrics.summary.totalSentCommits, 0);
  assert.equal(metrics.days.length, 7);
  assert.equal(metrics.projects.length, 0);
});
