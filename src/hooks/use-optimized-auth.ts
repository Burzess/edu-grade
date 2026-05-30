'use client'

import { useAuthStore, selectIsAuthenticated, selectUserRole, selectLoading } from '@/store/auth'
import { useMemo } from 'react'

// Define auth state type for better type safety
type AuthState = ReturnType<typeof useAuthStore.getState>

/**
 * Hook yang dioptimasi untuk auth checks tanpa re-renders berlebihan
 */
export function useOptimizedAuth() {
    const user = useAuthStore(state => state.user)
    const profile = useAuthStore(state => state.profile)
    const loading = useAuthStore(selectLoading)
    const isAuthenticated = useAuthStore(selectIsAuthenticated)
    const userRole = useAuthStore(selectUserRole)

    const computedValues = useMemo(() => ({
        isAuthenticated,
        userRole,
        isGuru: userRole === 'guru',
        isSiswa: userRole === 'siswa',
        isAdmin: userRole === 'admin',
        canAccess: (roles: string[]) => roles.includes(userRole || ''),
        user,
        profile,
        loading
    }), [user?.id, profile?.role, loading, isAuthenticated, userRole])

    return computedValues
}

/**
 * Lightweight hook untuk quick auth checks dengan stable reference
 */
export function useQuickAuthCheck() {
    const isAuthenticated = useAuthStore(selectIsAuthenticated)
    const loading = useAuthStore(selectLoading)
    const userRole = useAuthStore(selectUserRole)

    return useMemo(() => ({
        isAuthenticated,
        loading,
        userRole
    }), [isAuthenticated, loading, userRole])
}

/**
 * Hook untuk role-specific checks yang lebih performant
 */
export function useRoleCheck(allowedRoles: string[]) {
    const isAuthenticated = useAuthStore(selectIsAuthenticated)
    const loading = useAuthStore(selectLoading)
    const userRole = useAuthStore(selectUserRole)

    return useMemo(() => {
        const hasAccess = isAuthenticated && allowedRoles.includes(userRole || '')
        
        return {
            hasAccess,
            loading,
            userRole,
            isAuthenticated
        }
    }, [isAuthenticated, loading, userRole, allowedRoles])
}
