/**
 * Public routes that do not require authentication.
 */
export const PUBLIC_ROUTES = ['/login', '/auth/callback', '/unauthorized']

/**
 * Check if a pathname matches a public route.
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}
