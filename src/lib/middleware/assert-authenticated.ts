import { NextRequest, NextResponse } from 'next/server'

interface AssertAuthResult {
  authenticated: true
  userId: string
}

interface AssertAuthRedirect {
  authenticated: false
  redirect: NextResponse
}

/**
 * Assert that the request has valid JWT claims and a user ID.
 * Returns a redirect to /login if not authenticated.
 */
export function assertAuthenticated(
  request: NextRequest,
  claims: Record<string, unknown> | null,
  claimsError: Error | null,
  userId: string | null
): AssertAuthResult | AssertAuthRedirect {
  if (claimsError || !claims || !userId) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'Silakan login terlebih dahulu')
    if (request.nextUrl.pathname !== '/' && request.nextUrl.pathname !== '/login') {
      url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    }
    return { authenticated: false, redirect: NextResponse.redirect(url) }
  }
  return { authenticated: true, userId }
}
