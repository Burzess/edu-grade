/**
 * Supabase Auth Helpers - Best Practice 2026
 * 
 * File ini berisi helper functions untuk authentication yang aman.
 * Mengikuti best practices dari dokumentasi resmi Supabase.
 * 
 * ATURAN KEAMANAN:
 * 1. Server-side: Gunakan getClaims() atau getUser()
 * 2. Client-side: Gunakan getUser() untuk validasi, getSession() hanya untuk akses token
 * 3. JANGAN PERNAH percaya getSession() di server untuk proteksi
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// ============================================
// Types
// ============================================

export interface AuthUser {
  id: string
  email: string
  role?: 'guru' | 'siswa'
  full_name?: string
}

export interface AuthResult {
  user: AuthUser | null
  error: string | null
  isAuthenticated: boolean
}

// ============================================
// Server-Side Auth (API Routes, Server Components)
// ============================================

/**
 * Validasi auth di API Route menggunakan JWT dari Authorization header
 * Menggunakan getClaims() untuk validasi signature JWT yang aman
 * 
 * @param request - NextRequest object
 * @returns AuthResult dengan user info atau error
 */
export async function validateApiAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        user: null,
        error: 'Authorization header required',
        isAuthenticated: false
      }
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Buat client dengan token dari header
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {}
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Gunakan getUser() untuk validasi token dengan server
    // getUser() lebih aman karena memvalidasi dengan Supabase Auth server
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return {
        user: null,
        error: error?.message || 'Invalid token',
        isAuthenticated: false
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role as 'guru' | 'siswa',
        full_name: user.user_metadata?.full_name
      },
      error: null,
      isAuthenticated: true
    }
  } catch (err) {
    console.error('Auth validation error:', err)
    return {
      user: null,
      error: 'Authentication failed',
      isAuthenticated: false
    }
  }
}

/**
 * Validasi auth di Server Component menggunakan cookies
 * Menggunakan getClaims() untuk validasi signature JWT yang aman dan cepat
 * 
 * @returns AuthResult dengan user info atau error
 */
export async function validateServerAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    
    // getClaims() memvalidasi JWT signature tanpa request ke server
    // Lebih cepat dari getUser() tapi tetap aman
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    
    if (claimsError || !claimsData?.claims) {
      return {
        user: null,
        error: claimsError?.message || 'Not authenticated',
        isAuthenticated: false
      }
    }

    // Jika perlu data user lengkap, gunakan getUser()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return {
        user: null,
        error: userError?.message || 'User not found',
        isAuthenticated: false
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role as 'guru' | 'siswa',
        full_name: user.user_metadata?.full_name
      },
      error: null,
      isAuthenticated: true
    }
  } catch (err) {
    console.error('Server auth validation error:', err)
    return {
      user: null,
      error: 'Authentication failed',
      isAuthenticated: false
    }
  }
}

// ============================================
// Client-Side Auth (Hooks, Client Components)
// ============================================

/**
 * Validasi auth di Client Component
 * Menggunakan getUser() untuk memastikan token valid
 * 
 * CATATAN: Di client-side, getSession() aman tapi getUser() lebih reliable
 * karena memvalidasi token dengan server
 * 
 * @returns Promise<AuthResult>
 */
export async function validateClientAuth(): Promise<AuthResult> {
  try {
    const supabase = createBrowserClient()
    
    // getUser() memvalidasi token dengan Supabase server
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        user: null,
        error: error?.message || 'Not authenticated',
        isAuthenticated: false
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role as 'guru' | 'siswa',
        full_name: user.user_metadata?.full_name
      },
      error: null,
      isAuthenticated: true
    }
  } catch (err) {
    console.error('Client auth validation error:', err)
    return {
      user: null,
      error: 'Authentication failed',
      isAuthenticated: false
    }
  }
}

/**
 * Mendapatkan access token untuk API calls
 * Menggunakan getSession() karena kita hanya butuh token, bukan validasi
 * 
 * @returns access_token atau null
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

// ============================================
// Role Checking Helpers
// ============================================

/**
 * Check apakah user adalah guru
 */
export function isGuru(user: AuthUser | null): boolean {
  return user?.role === 'guru'
}

/**
 * Check apakah user adalah siswa
 */
export function isSiswa(user: AuthUser | null): boolean {
  return user?.role === 'siswa'
}

/**
 * Require role tertentu, throw error jika tidak sesuai
 */
export function requireRole(user: AuthUser | null, requiredRole: 'guru' | 'siswa'): void {
  if (!user) {
    throw new Error('User not authenticated')
  }
  if (user.role !== requiredRole) {
    throw new Error(`Access denied. Required role: ${requiredRole}`)
  }
}
