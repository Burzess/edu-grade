import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'
import {
  isPublicRoute,
  assertAuthenticated,
  enforceRoleAccess,
  resolveUserRole,
} from '@/lib/middleware'
import { getDashboardPathForRole } from '@/lib/auth/dashboard-path'

/**
 * Next.js Edge Middleware — orchestrator.
 *
 * Pipeline: refreshSession → handle public/root → assertAuthenticated →
 * resolveUserRole → enforceRoleAccess → forward with x-user-id header & preserved cookies.
 *
 * Performance (2.22): 1 getClaims() + 1 profiles SELECT = 2 round-trips.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Refresh session (single getClaims call)
  const { response, supabase, claims, claimsError, userId } =
    await updateSession(request)

  const isAuthenticated = !claimsError && !!claims && !!userId

  // 2. Root route: Landing page for guests, direct dashboard redirect for authenticated users
  if (pathname === '/') {
    if (isAuthenticated && userId) {
      const userRole = await resolveUserRole(supabase, userId)
      const url = request.nextUrl.clone()
      url.pathname = getDashboardPathForRole(userRole)
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
      })
      return redirectResponse
    }
    return response
  }

  // 3. Public routes (e.g. /login, /auth/callback, /unauthorized) — no auth needed
  if (isPublicRoute(pathname)) {
    return response
  }

  try {
    // 5. Assert authenticated (redirects to /login with redirect param if unauthenticated)
    const authResult = assertAuthenticated(request, claims, claimsError, userId)
    if (!authResult.authenticated) {
      response.cookies.getAll().forEach((cookie) => {
        authResult.redirect.cookies.set(cookie)
      })
      return authResult.redirect
    }

    // 6. Resolve role from DB (single profiles SELECT)
    const userRole = await resolveUserRole(supabase, authResult.userId)

    // 7. Enforce role-based access
    const roleRedirect = enforceRoleAccess(request, pathname, userRole)
    if (roleRedirect) {
      response.cookies.getAll().forEach((cookie) => {
        roleRedirect.cookies.set(cookie)
      })
      return roleRedirect
    }

    // 8. Forward request with x-user-id header & preserved session cookies (2.33)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', authResult.userId)

    const modifiedResponse = NextResponse.next({
      request: { headers: requestHeaders },
    })
    response.cookies.getAll().forEach((cookie) => {
      modifiedResponse.cookies.set(cookie)
    })
    return modifiedResponse
  } catch (error) {
    logger.error('Middleware error:', error)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'middleware_error')
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
