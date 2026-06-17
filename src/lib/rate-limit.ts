/**
 * In-memory sliding window rate limiter.
 *
 * NOTE: This implementation uses an in-memory Map and is suitable for
 * single-instance deployments. For production at scale (multiple instances
 * behind a load balancer), replace with a Redis/Upstash-backed store so
 * that rate-limit state is shared across all instances.
 */

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of remaining requests in the current window */
  remaining: number
  /** Unix timestamp (ms) when the window resets */
  resetAt: number
}

/** Internal store: key → array of request timestamps (ms) */
const store = new Map<string, number[]>()

/**
 * Check and consume a rate-limit token for the given key.
 *
 * Uses a sliding window approach: only timestamps within the current window
 * are counted. Old timestamps are pruned on each call.
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options
  const now = Date.now()
  const windowStart = now - windowMs

  // Get existing timestamps or initialize
  const timestamps = store.get(key) ?? []

  // Prune timestamps outside the current window
  const validTimestamps = timestamps.filter((ts) => ts > windowStart)

  if (validTimestamps.length >= limit) {
    // Rate limit exceeded
    const oldestInWindow = validTimestamps[0]
    const resetAt = oldestInWindow + windowMs
    store.set(key, validTimestamps)
    return {
      success: false,
      remaining: 0,
      resetAt,
    }
  }

  // Allow the request — record the timestamp
  validTimestamps.push(now)
  store.set(key, validTimestamps)

  return {
    success: true,
    remaining: limit - validTimestamps.length,
    resetAt: now + windowMs,
  }
}

/**
 * Clear all stored rate-limit data. Useful for testing.
 */
export function resetRateLimitStore(): void {
  store.clear()
}

// ---------------------------------------------------------------------------
// Pre-configured limiters for common use cases
// ---------------------------------------------------------------------------

/** 5 requests per 15 minutes per IP — for auth endpoints */
export function authLimiter(ip: string): RateLimitResult {
  return rateLimit(`auth:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
}

/** 20 requests per hour per user — for AI grading */
export function aiGradingLimiter(userId: string): RateLimitResult {
  return rateLimit(`ai-grading:${userId}`, { limit: 20, windowMs: 60 * 60 * 1000 })
}

/** 1 request per 5 seconds per user — for admin write operations */
export function adminWriteLimiter(userId: string): RateLimitResult {
  return rateLimit(`admin-write:${userId}`, { limit: 1, windowMs: 5 * 1000 })
}

/** 3 requests per minute per IP — for logout */
export function logoutLimiter(ip: string): RateLimitResult {
  return rateLimit(`logout:${ip}`, { limit: 3, windowMs: 60 * 1000 })
}
