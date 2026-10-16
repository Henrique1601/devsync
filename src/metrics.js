export function calculateMetrics(entries = [], projects = []) {
  let totalSyncs = 0;
  let successfulSyncs = 0;
  let totalReceivedCommits = 0;
  let totalSentCommits = 0;
  let checkpointsCreated = 0;

  const projectStats = new Map();
  for (const p of projects) {
    projectStats.set(p.id, { id: p.id, name: p.name, syncs: 0, received: 0, sent: 0, lastState: p.state || 'synced' });
  }

  const daysMap = new Map();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daysMap.set(key, { date: key, count: 0, received: 0, sent: 0 });
  }

  for (const entry of entries) {
    if (!['sync', 'stash-sync'].includes(entry.action)) continue;
    totalSyncs++;
    if (['synced', 'ahead'].includes(entry.state)) successfulSyncs++;
    const received = entry.receivedCommits || 0;
    const sent = entry.sentCommits || 0;
    totalReceivedCommits += received;
    totalSentCommits += sent;
    if (entry.checkpointCreated) checkpointsCreated++;

    // Project breakdown
    if (entry.projectId) {
      const stat = projectStats.get(entry.projectId) || { id: entry.projectId, name: entry.projectName || entry.projectId, syncs: 0, received: 0, sent: 0 };
      stat.syncs++;
      stat.received += received;
      stat.sent += sent;
      projectStats.set(entry.projectId, stat);
    }

    // Daily breakdown (last 7 days)
    const dayKey = (entry.finishedAt || entry.startedAt || '').slice(0, 10);
    if (daysMap.has(dayKey)) {
      const day = daysMap.get(dayKey);
      day.count++;
      day.received += received;
      day.sent += sent;
    }
  }

  const estimatedMinutesSaved = Math.round((totalReceivedCommits + totalSentCommits) * 2.5 + (totalSyncs * 0.4));

  return {
    summary: {
      totalSyncs,
      successRate: totalSyncs ? Math.round((successfulSyncs / totalSyncs) * 100) : 100,
      totalReceivedCommits,
      totalSentCommits,
      checkpointsCreated,
      estimatedHoursSaved: (estimatedMinutesSaved / 60).toFixed(1),
      estimatedMinutesSaved
    },
    days: Array.from(daysMap.values()),
    projects: Array.from(projectStats.values()).sort((a, b) => b.syncs - a.syncs)
  };
}
