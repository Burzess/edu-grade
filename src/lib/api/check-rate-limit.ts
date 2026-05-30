import { NextRequest, NextResponse } from 'next/server'
import type { RateLimitResult } from '@/lib/rate-limit'

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Check rate limit result and return 429 response if exceeded.
 * Returns null if allowed.
 */
export function checkRateLimit(result: RateLimitResult): NextResponse | null {
  if (result.success) return null
  return NextResponse.json(
    { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
    }
  )
}
