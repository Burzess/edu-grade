import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API endpoint sederhana untuk mendapatkan auth data dari middleware headers
 * Ini memungkinkan client-side components mengakses data user tanpa query database
 */
export async function GET(request: NextRequest) {
  // Headers ini sudah di-set oleh middleware
  const userId = request.headers.get('x-user-id')
  const userEmail = request.headers.get('x-user-email')
  const userRole = request.headers.get('x-user-role')

  const isAuthenticated = !!(userId && userEmail && userRole)

  return NextResponse.json({
    isAuthenticated,
    user: isAuthenticated ? {
      id: userId,
      email: userEmail,
      role: userRole
    } : null
  }, {
    // Pass the headers back untuk client bisa akses
    headers: {
      'x-user-id': userId || '',
      'x-user-email': userEmail || '',
      'x-user-role': userRole || ''
    }
  })
}