/**
 * A simple bounded-concurrency semaphore.
 *
 * Ensures at most `limit` async operations run simultaneously.
 * No artificial delays — throughput is bounded only by the concurrency cap.
 *
 * @param limit Maximum number of concurrent operations (must be >= 1)
 */
export function createSemaphore(limit: number) {
  if (limit < 1) {
    throw new Error('Semaphore limit must be at least 1')
  }

  let active = 0
  const waiting: Array<() => void> = []

  function acquire(): Promise<void> {
    if (active < limit) {
      active++
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      waiting.push(resolve)
    })
  }

  function release(): void {
    const next = waiting.shift()
    if (next) {
      // Hand the slot directly to the next waiter (active count stays the same)
      next()
    } else {
      active--
    }
  }

  return { acquire, release }
}

/**
 * Run an array of async tasks with bounded concurrency.
 *
 * @param items Items to process
 * @param concurrency Maximum number of concurrent tasks
 * @param fn Async function to apply to each item
 * @returns Results in the same order as the input items
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const semaphore = createSemaphore(concurrency)
  const results: Promise<R>[] = items.map(async (item) => {
    await semaphore.acquire()
    try {
      return await fn(item)
    } finally {
      semaphore.release()
    }
  })
  return Promise.all(results)
}
