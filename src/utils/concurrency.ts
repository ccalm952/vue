/**
 * 对 items 并行执行 fn，同时最多 running 个 Promise 在执行（用于限制 HTTP 并发等）。
 */
export async function forEachWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const n = Math.min(Math.max(1, limit), items.length);
  let idx = 0;
  async function worker() {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: n }, () => worker()));
}
