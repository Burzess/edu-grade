'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'

export interface MiddlewareAuth {
  userId: string | null
  userEmail: string | null
  userRole: 'guru' | 'siswa' | 'admin' | null
  isAuthenticated: boolean
  isGuru: boolean
  isSiswa: boolean
  isAdmin: boolean
  loading: boolean
  error: string | null
}

interface AuthCheckResponse {
  isAuthenticated: boolean
  user: {
    id: string
    email: string
    role: 'guru' | 'siswa' | 'admin'
  } | null
}

/**
 * Fetch auth check from the server.
 * Extracted as a standalone function so React Query can deduplicate
 * concurrent calls across all components using this hook.
 */
async function fetchAuthCheck(): Promise<AuthCheckResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-cache',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 401) {
      return { isAuthenticated: false, user: null }
    }

    const body = await response.json()
    return {
      isAuthenticated: body?.isAuthenticated === true && !!body?.user?.id,
      user: body?.user ?? null,
    }
  } catch {
    clearTimeout(timeoutId)
    throw new Error('Auth check failed')
  }
}

/**
 * Read cached auth state from sessionStorage for instant rendering on page load.
 * Returns undefined if no valid cache exists.
 */
function getCachedInitialData(): AuthCheckResponse | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const cached = sessionStorage.getItem('auth-state-cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        const user = parsed.state?.user
        const profile = parsed.state?.profile
        if (user && profile) {
          return {
            isAuthenticated: true,
            user: {
              id: user.id,
              email: user.email ?? '',
              role: profile.role,
            },
          }
        }
      }
    }
  } catch {
    // Ignore parse errors — will fetch fresh data
  }

  return undefined
}

/**
 * Hook untuk mengakses auth data dari middleware headers dengan React Query optimization.
 *
 * Uses React Query's single-flight deduplication so all guarded sections
 * on a single dashboard share one in-flight request instead of each
 * component triggering its own fetch on mount.
 *
 * staleTime is set to 5 minutes (≥ session lifetime / 2) to avoid
 * unnecessary re-fetches within a session.
 */
export function useMiddlewareAuth(): MiddlewareAuth {
  const { setUser, setProfile } = useAuthStore()

  const { data, isLoading, error } = useQuery<AuthCheckResponse>({
    queryKey: ['auth-check'],
    queryFn: fetchAuthCheck,
    staleTime: 5 * 60 * 1000, // 5 minutes — avoids redundant round-trips
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    initialData: getCachedInitialData,
  })

  // Sync with auth store for compatibility with other components
  useEffect(() => {
    if (!data) return

    if (data.isAuthenticated && data.user) {
      const { id, email, role } = data.user

      const minimalUser = {
        id,
        email: email ?? '',
        user_metadata: { role },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        role: 'authenticated',
      } as unknown as Parameters<typeof setUser>[0]

      const minimalProfile = {
        id,
        email: email ?? '',
        full_name: (email ?? '').split('@')[0],
        role,
        preferences: null,
        created_at: new Date().toISOString(),
      }

      setUser(minimalUser)
      setProfile(minimalProfile)
    }
  }, [data, setUser, setProfile])

  // Derive the MiddlewareAuth shape from query state
  if (isLoading && !data) {
    return {
      userId: null,
      userEmail: null,
      userRole: null,
      isAuthenticated: false,
      isGuru: false,
      isSiswa: false,
      isAdmin: false,
      loading: true,
      error: null,
    }
  }

  if (error) {
    return {
      userId: null,
      userEmail: null,
      userRole: null,
      isAuthenticated: false,
      isGuru: false,
      isSiswa: false,
      isAdmin: false,
      loading: false,
      error: error instanceof Error ? error.message : 'Auth check failed',
    }
  }

  const userId = data?.user?.id ?? null
  const userEmail = data?.user?.email ?? null
  const userRole = (data?.user?.role ?? null) as 'guru' | 'siswa' | 'admin' | null
  const isAuthenticated = data?.isAuthenticated === true && !!userId

  return {
    userId,
    userEmail,
    userRole,
    isAuthenticated,
    isGuru: userRole === 'guru',
    isSiswa: userRole === 'siswa',
    isAdmin: userRole === 'admin',
    loading: false,
    error: null,
  }
}

/**
 * Hook yang khusus untuk component guards
 * Return boolean langsung untuk conditional rendering
 */
export function useAuthGuard(requiredRole?: 'guru' | 'siswa' | 'admin') {
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
    isAdmin: auth.isAdmin,
    role: auth.userRole,
    canAccess: (allowedRoles: ('guru' | 'siswa' | 'admin')[]) => {
      return auth.userRole ? allowedRoles.includes(auth.userRole) : false
    },
  }
}

/**
 * Utility function untuk clear auth cache
 * Gunakan saat logout atau refresh auth
 */
export function clearAuthCache() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('auth-quick-cache')
  }
}
