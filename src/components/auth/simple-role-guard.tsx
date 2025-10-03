'use client'

import { useMiddlewareAuth } from '@/hooks/use-middleware-auth'
import { ReactNode, memo } from 'react'
import { InlineAuthLoading } from './auth-loading'

// Type definitions
type UserRole = 'guru' | 'siswa'

interface SimpleRoleGuardProps {
    children: ReactNode
    requiredRole?: UserRole
    allowedRoles?: UserRole[]
    fallback?: ReactNode
    showLoading?: boolean
    loadingMessage?: string
}

/**
 * Simplified Role Guard yang bekerja dengan middleware
 * Lebih ringan karena middleware sudah handle route protection
 */
export const SimpleRoleGuard = memo(({ 
    children, 
    requiredRole,
    allowedRoles,
    fallback = (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center p-8 bg-card rounded-lg border shadow-lg">
                <div className="text-4xl mb-4">🚫</div>
                <h3 className="text-lg font-semibold mb-2">Akses Ditolak</h3>
                <p className="text-muted-foreground">Anda tidak memiliki izin untuk mengakses konten ini.</p>
            </div>
        </div>
    ),
    showLoading = true,
    loadingMessage = "Memverifikasi akses..."
}: SimpleRoleGuardProps) => {
    const { isAuthenticated, userRole, loading, error } = useMiddlewareAuth()

    // Determine allowed roles
    const roles = allowedRoles || (requiredRole ? [requiredRole] : [])

    // Loading state
    if (loading && showLoading) {
        return <InlineAuthLoading message={loadingMessage} />
    }

    // Error state (middleware should have handled this, but as fallback)
    if (error) {
        // Don't log AbortErrors as they are expected during navigation/timeouts
        if (!error.includes('AbortError') && !error.includes('signal is aborted')) {
            console.warn('SimpleRoleGuard: Auth error detected:', error)
        }
        
        // For AbortErrors, just show loading briefly then let middleware handle
        if (error.includes('AbortError') || error.includes('signal is aborted')) {
            return showLoading ? <InlineAuthLoading message="Memverifikasi akses..." /> : null
        }
        
        return <InlineAuthLoading message="Terjadi kesalahan, mencoba lagi..." />
    }

    // Not authenticated (middleware should redirect, but as fallback)
    if (!isAuthenticated) {
        console.warn('SimpleRoleGuard: User not authenticated - middleware should have redirected')
        return <InlineAuthLoading message="Mengalihkan ke login..." />
    }

    // Role check
    if (roles.length > 0 && userRole && !roles.includes(userRole)) {
        console.warn('SimpleRoleGuard: Access denied for role:', userRole, 'Required:', roles)
        return <>{fallback}</>
    }

    // All checks passed
    return <>{children}</>
})
SimpleRoleGuard.displayName = 'SimpleRoleGuard'

/**
 * Inline role guard untuk conditional rendering dalam components
 */
export const InlineRoleGuard = memo(({ 
    children, 
    requiredRole,
    allowedRoles,
    fallback = null,
    showLoading = false,
    loadingMessage = "Memuat..."
}: SimpleRoleGuardProps) => {
    const { userRole, loading } = useMiddlewareAuth()

    // Determine allowed roles
    const roles = allowedRoles || (requiredRole ? [requiredRole] : [])

    // Loading state
    if (loading && showLoading) {
        return <InlineAuthLoading message={loadingMessage} />
    }

    // Role check
    if (roles.length > 0 && userRole && !roles.includes(userRole)) {
        return <>{fallback}</>
    }

    return <>{children}</>
})
InlineRoleGuard.displayName = 'InlineRoleGuard'

/**
 * Specific guards untuk kemudahan penggunaan
 */
export const GuruOnly = memo(({ 
    children, 
    fallback = null, 
    showLoading = false 
}: { 
    children: ReactNode
    fallback?: ReactNode
    showLoading?: boolean 
}) => (
    <InlineRoleGuard 
        requiredRole="guru" 
        fallback={fallback} 
        showLoading={showLoading}
    >
        {children}
    </InlineRoleGuard>
))
GuruOnly.displayName = 'GuruOnly'

export const SiswaOnly = memo(({ 
    children, 
    fallback = null, 
    showLoading = false 
}: { 
    children: ReactNode
    fallback?: ReactNode
    showLoading?: boolean 
}) => (
    <InlineRoleGuard 
        requiredRole="siswa" 
        fallback={fallback} 
        showLoading={showLoading}
    >
        {children}
    </InlineRoleGuard>
))
SiswaOnly.displayName = 'SiswaOnly'

/**
 * Legacy AuthGuard alias untuk backward compatibility
 */
export const AuthGuard = SimpleRoleGuard
export { SimpleRoleGuard as RoleGuard }