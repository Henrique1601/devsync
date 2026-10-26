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

/**
 * Executes a list of asynchronous task factories with bounded concurrency.
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {number} concurrency
 * @returns {Promise<T[]>}
 */
export async function mapConcurrent(tasks, concurrency = 2) {
  const results = new Array(tasks.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await settleOperations(workers);
  return results;
}