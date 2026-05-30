import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'
import {
  isPublicRoute,
  assertAuthenticated,
  enforceRoleAccess,
  resolveUserRole,
} from '@/lib/middleware'

/**
 * Next.js Edge Middleware — orchestrator.
 *
 * Pipeline: refreshSession → assertAuthenticated → resolveUserRole →
 * enforceRoleAccess → forward with x-user-id header.
 *
 * Performance (2.22): 1 getClaims() + 1 profiles SELECT = 2 round-trips.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Refresh session (single getClaims call)
  const { response, supabase, claims, claimsError, userId } =
    await updateSession(request)

  // 2. Public routes — no auth needed
  if (isPublicRoute(pathname)) {
    return response
  }

  try {
    // 3. Assert authenticated
    const authResult = assertAuthenticated(request, claims, claimsError, userId)
    if (!authResult.authenticated) {
      return authResult.redirect
    }

    // 4. Resolve role from DB (single profiles SELECT)
    const userRole = await resolveUserRole(supabase, authResult.userId)

    // 5. Enforce role-based access
    const roleRedirect = enforceRoleAccess(request, pathname, userRole)
    if (roleRedirect) {
      return roleRedirect
    }

    // 6. Forward request with x-user-id header only (2.33)
    const modifiedResponse = NextResponse.next({
      request: { headers: request.headers },
    })
    modifiedResponse.headers.set('x-user-id', authResult.userId)
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
