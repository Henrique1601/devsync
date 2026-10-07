// Do not release service ownership while sibling operations are still running.
export async function settleOperations(operations) {
  const results = await Promise.allSettled(operations);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  return results.map(result => result.value);
}

export async function withBusy(busy, id, operation) {
  busy.add(id);
  try { return await operation(); }
  finally { busy.delete(id); }
}
