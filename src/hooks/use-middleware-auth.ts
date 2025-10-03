'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

export interface MiddlewareAuth {
  userId: string | null
  userEmail: string | null
  userRole: 'guru' | 'siswa' | null
  isAuthenticated: boolean
  isGuru: boolean
  isSiswa: boolean
  loading: boolean
  error: string | null
}

/**
 * Hook untuk mengakses auth data dari middleware headers dengan cache optimization
 */
export function useMiddlewareAuth(): MiddlewareAuth {
  const [authData, setAuthData] = useState<MiddlewareAuth>(() => {
    // Inisialisasi dengan cached state jika ada
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem('auth-state-cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            return {
              userId: parsed.state.user?.id || null,
              userEmail: parsed.state.user?.email || null,
              userRole: parsed.state.profile?.role || null,
              isAuthenticated: !!(parsed.state.user && parsed.state.profile),
              isGuru: parsed.state.profile?.role === 'guru',
              isSiswa: parsed.state.profile?.role === 'siswa',
              loading: false, // Set false untuk immediate rendering
              error: null
            }
          }
        }
      } catch (error) {
        console.warn('Failed to parse auth cache:', error)
      }
    }
    
    return {
      userId: null,
      userEmail: null,
      userRole: null,
      isAuthenticated: false,
      isGuru: false,
      isSiswa: false,
      loading: true,
      error: null
    }
  })

  const { setUser, setProfile } = useAuthStore()

  useEffect(() => {
    const checkMiddlewareHeaders = async () => {
      try {
        // Jika sudah ada cached data yang fresh, skip fetch untuk performa
        if (authData.isAuthenticated && !authData.loading) {
          return
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-cache',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.status === 401) {
          setAuthData({
            userId: null,
            userEmail: null,
            userRole: null,
            isAuthenticated: false,
            isGuru: false,
            isSiswa: false,
            loading: false,
            error: null
          })
          return
        }

        // Ambil data dari headers yang di-set oleh middleware
        const userId = response.headers.get('x-user-id')
        const userEmail = response.headers.get('x-user-email')
        const userRole = response.headers.get('x-user-role') as 'guru' | 'siswa' | null

        const isAuthenticated = !!(userId && userEmail && userRole)
        
        const newAuthData = {
          userId,
          userEmail,
          userRole,
          isAuthenticated,
          isGuru: userRole === 'guru',
          isSiswa: userRole === 'siswa',
          loading: false,
          error: null
        }

        setAuthData(newAuthData)

        // Sync dengan store untuk compatibility
        if (isAuthenticated && userId && userEmail && userRole) {
          const minimalUser = {
            id: userId,
            email: userEmail,
            user_metadata: { role: userRole },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            role: 'authenticated'
          } as any

          const minimalProfile = {
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            role: userRole,
            created_at: new Date().toISOString()
          }

          setUser(minimalUser)
          setProfile(minimalProfile)
        }

      } catch (error) {
        console.error('Failed to check middleware auth:', error)
        const errorMessage = error instanceof Error ? error.message : 'Auth check failed'
        
        setAuthData({ 
          userId: null,
          userEmail: null,
          userRole: null,
          isAuthenticated: false,
          isGuru: false,
          isSiswa: false,
          loading: false, 
          error: errorMessage
        })
      }
    }

    checkMiddlewareHeaders()
  }, [setUser, setProfile])

  return authData
}

/**
 * Hook yang khusus untuk component guards
 * Return boolean langsung untuk conditional rendering
 */
export function useAuthGuard(requiredRole?: 'guru' | 'siswa') {
  const auth = useMiddlewareAuth()

  if (!auth.isAuthenticated) {
    return { allowed: false, loading: auth.loading, reason: 'not_authenticated' }
  }

  if (requiredRole && auth.userRole !== requiredRole) {
    return { allowed: false, loading: false, reason: 'insufficient_role' }
  }

  return { allowed: true, loading: false, reason: null }
}

/**
 * Hook untuk role checks yang cepat tanpa re-render berlebihan
 */
export function useRoleCheck() {
  const auth = useMiddlewareAuth()

  return {
    isGuru: auth.isGuru,
    isSiswa: auth.isSiswa,
    role: auth.userRole,
    canAccess: (allowedRoles: ('guru' | 'siswa')[]) => {
      return auth.userRole ? allowedRoles.includes(auth.userRole) : false
    }
  }
}

/**
 * Utility function untuk clear auth cache
 * Gunakan saat logout atau refresh auth
 */
export function clearAuthCache() {
  // Tidak ada cache lagi, jadi hanya clear sessionStorage jika ada
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth-quick-cache')
  }
}