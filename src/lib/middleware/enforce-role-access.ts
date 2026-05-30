import { NextRequest, NextResponse } from 'next/server'
import { ROLES, type UserRole } from '@/types/auth'
import { getDashboardPathForRole } from '@/lib/auth/dashboard-path'

/**
 * Enforce role-based access control on the current pathname.
 * Returns a redirect if the user's role does not match the route prefix.
 * Returns null if access is allowed.
 */
export function enforceRoleAccess(
  request: NextRequest,
  pathname: string,
  userRole: UserRole
): NextResponse | null {
  const url = request.nextUrl.clone()

  // Redirect root to role-appropriate dashboard
  if (pathname === '/') {
    url.pathname = getDashboardPathForRole(userRole)
    return NextResponse.redirect(url)
  }

  // Admin routes — admin only
  if (pathname.startsWith('/admin') && userRole !== ROLES.ADMIN) {
    url.pathname = getDashboardPathForRole(userRole)
    return NextResponse.redirect(url)
  }

  // Guru routes — guru only
  if (pathname.startsWith('/guru') && userRole !== ROLES.GURU) {
    url.pathname = getDashboardPathForRole(userRole)
    return NextResponse.redirect(url)
  }

  // Siswa routes — siswa only
  if (pathname.startsWith('/siswa') && userRole !== ROLES.SISWA) {
    url.pathname = getDashboardPathForRole(userRole)
    return NextResponse.redirect(url)
  }

  // Authenticated user on /login → redirect to dashboard
  if (pathname === '/login') {
    url.pathname = getDashboardPathForRole(userRole)
    return NextResponse.redirect(url)
  }

  return null
}
