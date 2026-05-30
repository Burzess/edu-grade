import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authLimiter } from '@/lib/rate-limit'
import { getClientIp, checkRateLimit } from '@/lib/api/check-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * API endpoint untuk mendapatkan auth data
 * Menggunakan server-side getUser() untuk validasi yang aman
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(authLimiter(getClientIp(request)))
  if (limited) return limited

  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null
      })
    }

    // Fetch role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'siswa'

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: userRole
      }
    })
  } catch (_error: unknown) {
    return NextResponse.json({
      isAuthenticated: false,
      user: null
    })
  }
}
