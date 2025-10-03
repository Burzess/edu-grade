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

// Cache auth data untuk mengurangi API calls berulang
let cachedAuthData: MiddlewareAuth | null = null
let lastCheckTime = 0
const CACHE_DURATION = 30000 // 30 detik cache

/**
 * Hook untuk mengakses auth data dari middleware headers
 * Dengan caching untuk mengurangi loading berlebihan saat navigasi
 */
export function useMiddlewareAuth(): MiddlewareAuth {
  const [authData, setAuthData] = useState<MiddlewareAuth>(() => {
    // Coba ambil dari sessionStorage dulu
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('auth-quick-cache')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          const isRecent = Date.now() - parsed.timestamp < 5000 // 5 detik untuk navigasi cepat
          if (isRecent) {
            // Emit cache hit event
            if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('authDebug', {
                detail: { type: 'auth_cache_hit', data: { source: 'sessionStorage' } }
              }))
            }
            return { ...parsed.data, loading: false }
          }
        } catch (e) {
          sessionStorage.removeItem('auth-quick-cache')
        }
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

  const { setUser, setProfile, setMiddlewareAuth, setMiddlewareChecked, middlewareChecked } = useAuthStore()

  useEffect(() => {
    // Skip jika ada cache yang masih fresh
    const now = Date.now()
    if (cachedAuthData && (now - lastCheckTime) < CACHE_DURATION && !authData.loading) {
      setAuthData(cachedAuthData)
      return
    }

    // Skip jika middleware sudah dicek dan tidak loading
    if (middlewareChecked && !authData.loading) return

    // Function untuk mengecek headers dari response dengan optimasi
    const checkMiddlewareHeaders = async () => {
      try {
        // Set loading hanya jika belum ada cache
        if (!cachedAuthData) {
          setAuthData(prev => ({ ...prev, loading: true }))
        }

        // Use robust fetch utility
        const { authFetch } = await import('@/lib/fetch-utils')
        const response = await authFetch('/api/auth/check')

        // Jika response menunjukkan unauthorized, coba refresh session
        if (response.status === 401) {
          console.log('Auth check returned 401, attempting session refresh...')
          
          try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { error: refreshError } = await supabase.auth.refreshSession()
            
            if (!refreshError) {
              console.log('Session refreshed successfully, retrying auth check...')
              // Retry auth check setelah refresh
              const retryResponse = await fetch('/api/auth/check', {
                method: 'GET',
                credentials: 'include',
                cache: 'no-cache'
              })
              
              if (retryResponse.ok) {
                // Use retry response untuk get headers
                const userId = retryResponse.headers.get('x-user-id')
                const userEmail = retryResponse.headers.get('x-user-email')
                const userRole = retryResponse.headers.get('x-user-role') as 'guru' | 'siswa' | null

                const isAuthenticated = !!(userId && userEmail && userRole)
                
                const refreshedAuthData = {
                  userId,
                  userEmail,
                  userRole,
                  isAuthenticated,
                  isGuru: userRole === 'guru',
                  isSiswa: userRole === 'siswa',
                  loading: false,
                  error: null
                }

                // Update cache
                cachedAuthData = refreshedAuthData
                lastCheckTime = now

                // Simpan ke sessionStorage
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('auth-quick-cache', JSON.stringify({
                    data: refreshedAuthData,
                    timestamp: now
                  }))
                }

                setAuthData(refreshedAuthData)
                setMiddlewareAuth(true)
                setMiddlewareChecked(true)
                return
              }
            }
          } catch (refreshError) {
            console.warn('Session refresh failed:', refreshError)
          }
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

        // Update cache
        cachedAuthData = newAuthData
        lastCheckTime = now

        // Simpan ke sessionStorage untuk navigasi cepat
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth-quick-cache', JSON.stringify({
            data: newAuthData,
            timestamp: now
          }))
        }

        setAuthData(newAuthData)

        // Update store flags
        setMiddlewareAuth(true)
        setMiddlewareChecked(true)

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
            role: 'authenticated',
            session_id: 'middleware-session'
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
        // Handle AbortError lebih graceful
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Auth check was aborted (likely due to timeout or component unmount)')
          // Jangan set error state untuk AbortError, karena ini normal behavior
          return
        }
        
        console.error('Failed to check middleware auth:', error)
        const errorMessage = error instanceof Error ? error.message : 'Auth check failed'
        
        const errorAuthData = { 
          userId: null,
          userEmail: null,
          userRole: null,
          isAuthenticated: false,
          isGuru: false,
          isSiswa: false,
          loading: false, 
          error: errorMessage
        }

        setAuthData(errorAuthData)
        setMiddlewareChecked(true)
      }
    }

    checkMiddlewareHeaders()
  }, [setUser, setProfile, setMiddlewareAuth, setMiddlewareChecked, middlewareChecked])

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
  cachedAuthData = null
  lastCheckTime = 0
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth-quick-cache')
  }
}