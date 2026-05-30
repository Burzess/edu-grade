'use client'

import { useMiddlewareAuth } from '@/hooks/use-middleware-auth'
import { ReactNode, memo } from 'react'
import { InlineAuthLoading } from './auth-loading'

// Type definitions
type UserRole = 'guru' | 'siswa' | 'admin'

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
    showLoading = false,
    loadingMessage = "Memverifikasi akses..."
}: SimpleRoleGuardProps) => {
    const { isAuthenticated, userRole, loading, error } = useMiddlewareAuth()

    // Determine allowed roles
    const roles = allowedRoles || (requiredRole ? [requiredRole] : [])

    // Optimized loading state - sangat singkat untuk UX yang smooth
    if (loading && showLoading) {
        // Hanya tampilkan loading jika benar-benar diperlukan
        return null // Tidak tampilkan loading untuk navigasi yang smooth
    }

    // Error state (middleware should have handled this, but as fallback)
    if (error) {
        // Don't log AbortErrors as they are expected during navigation/timeouts
        if (!error.includes('AbortError') && !error.includes('signal is aborted')) {
            console.warn('SimpleRoleGuard: Auth error detected:', error)
        }
        
        // For AbortErrors or timeout errors, just show content (middleware will handle)
        if (error.includes('AbortError') || 
            error.includes('signal is aborted') || 
            error.includes('timeout')) {
            // Trust middleware to handle auth and show content immediately
            return <>{children}</>
        }
        
        return null // Minimal error handling untuk smooth UX
    }

    // Quick auth check - trust middleware for most cases
    if (!isAuthenticated && typeof window !== 'undefined') {
        // Check session storage cache untuk immediate auth state
        try {
            const cached = sessionStorage.getItem('auth-state-cache')
            if (cached) {
                const parsed = JSON.parse(cached)
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                    // Use cached auth state untuk immediate rendering
                    const cachedAuth = parsed.state
                    if (cachedAuth.user && cachedAuth.profile) {
                        // Show content immediately if cached auth exists
                        return <>{children}</>
                    }
                }
            }
        } catch (error: unknown) {
            // Ignore cache errors
        }
        
        // No valid cache and not authenticated — redirect to login
        if (!loading) {
            window.location.href = '/login?error=session_expired'
        }
        return null
    }

    // Role check - lebih lenient untuk UX yang smooth
    if (roles.length > 0 && userRole && !roles.includes(userRole)) {
        // Log untuk debugging tapi jangan block terlalu agresif
        console.warn('SimpleRoleGuard: Access denied for role:', userRole, 'Required:', roles)
        return <>{fallback}</>
    }

    // Default: show content (trust middleware for protection)
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

export const AdminOnly = memo(({ 
    children, 
    fallback = null, 
    showLoading = false 
}: { 
    children: ReactNode
    fallback?: ReactNode
    showLoading?: boolean 
}) => (
    <InlineRoleGuard 
        requiredRole="admin" 
        fallback={fallback} 
        showLoading={showLoading}
    >
        {children}
    </InlineRoleGuard>
))
AdminOnly.displayName = 'AdminOnly'

/**
 * Legacy AuthGuard alias untuk backward compatibility
 */
export const AuthGuard = SimpleRoleGuard
export { SimpleRoleGuard as RoleGuard }