'use client'

import { useRoleCheck, useQuickAuthCheck } from '@/hooks/use-optimized-auth'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, memo, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Loader2 } from 'lucide-react'

// Type definitions untuk role system
type UserRole = 'guru' | 'siswa'

interface RoleGuardProps {
    children: ReactNode
    allowedRoles: UserRole[]
    fallbackPath?: string
}

// Komponen loading minimal untuk redirect cepat (tanpa progress bar)
const QuickRedirectLoader = memo(() => (
    <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
))
QuickRedirectLoader.displayName = 'QuickRedirectLoader'

// Komponen loading yang konsisten dengan timeout handling
const LoadingScreen = memo(({ message = "Memuat..." }: { message?: string }) => {
    const [progress, setProgress] = useState(0)
    const [timeoutWarning, setTimeoutWarning] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev: number) => {
                const newProgress = prev + 5
                if (newProgress >= 100) {
                    setTimeoutWarning(true)
                    return 100
                }
                return newProgress
            })
        }, 250) // Update setiap 250ms

        const warningTimeout = setTimeout(() => {
            setTimeoutWarning(true)
        }, 4000) // Warning setelah 4 detik

        return () => {
            clearInterval(interval)
            clearTimeout(warningTimeout)
        }
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100">
            <Card className="w-full max-w-md shadow-lg border-0">
                <CardContent className="pt-8 pb-8">
                    <div className="flex flex-col items-center space-y-4">
                        <Loader2 className={`h-8 w-8 animate-spin ${timeoutWarning ? 'text-orange-500' : 'text-brand-500'}`} />
                        <p className={`text-sm font-medium ${timeoutWarning ? 'text-orange-600' : 'text-muted-foreground'}`}>
                            {timeoutWarning ? "Memverifikasi akses (membutuhkan waktu lebih lama)..." : message}
                        </p>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-muted rounded-full h-1.5">
                            <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    timeoutWarning ? 'bg-orange-500' : 'bg-brand-500'
                                }`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {timeoutWarning && (
                            <div className="text-xs text-orange-600 text-center space-y-1">
                                <p>Jika loading terlalu lama, coba:</p>
                                <p>• Refresh halaman</p>
                                <p>• Periksa koneksi internet</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
})
LoadingScreen.displayName = 'LoadingScreen'

// Komponen access denied yang lebih informatif
const AccessDeniedScreen = memo(({ currentRole, requiredRoles }: { 
    currentRole: string
    requiredRoles: UserRole[] 
}) => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <Card className="w-full max-w-md shadow-lg border-0">
            <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center space-y-6 text-center">
                    <Shield className="h-16 w-16 text-red-500" />
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900">Akses Ditolak</h3>
                        <p className="text-sm text-gray-600">
                            Halaman ini hanya dapat diakses oleh: {requiredRoles.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                            Role Anda saat ini: <span className="font-semibold text-gray-700">{currentRole}</span>
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
))
AccessDeniedScreen.displayName = 'AccessDeniedScreen'

// Utility functions untuk redirect logic
const getDefaultDashboardPath = (role: UserRole): string => {
    switch (role) {
        case 'guru':
            return '/guru/dashboard'
        case 'siswa':
            return '/siswa/dashboard'
        default:
            return '/login'
    }
}

// Custom hook untuk menghandle redirect logic
const useAuthRedirect = () => {
    const router = useRouter()
    
    const redirectTo = useCallback((path: string) => {
        // Use window.location for reliable redirect when auth state is broken
        // router.replace can fail silently during auth state transitions
        window.location.href = path
    }, [])
    
    const redirectToDashboard = useCallback((role: UserRole) => {
        const dashboardPath = getDefaultDashboardPath(role)
        redirectTo(dashboardPath)
    }, [redirectTo])
    
    return { redirectTo, redirectToDashboard }
}

// Guard untuk mencegah user yang sudah login mengakses halaman login/register
export const AuthRedirectGuard = memo(({ children }: { children: ReactNode }) => {
    const { isAuthenticated, loading, userRole } = useQuickAuthCheck()
    const { redirectToDashboard } = useAuthRedirect()

    useEffect(() => {
        // Skip if still loading or not authenticated
        if (loading || !isAuthenticated || !userRole) return

        // Redirect to appropriate dashboard
        redirectToDashboard(userRole as UserRole)
    }, [isAuthenticated, userRole, loading, redirectToDashboard])

    // Loading state saat mengecek auth status
    if (loading) {
        return <QuickRedirectLoader />
    }

    // Jika user sudah login, tampilkan loader minimal saat redirect
    if (isAuthenticated && userRole) {
        return <QuickRedirectLoader />
    }

    // Jika belum login, render children (halaman login/register)
    return <>{children}</>
})
AuthRedirectGuard.displayName = 'AuthRedirectGuard'

// Main role guard component
export const RoleGuard = memo(({ children, allowedRoles, fallbackPath }: RoleGuardProps) => {
    const { hasAccess, loading, userRole, isAuthenticated } = useRoleCheck(allowedRoles)
    const { redirectTo, redirectToDashboard } = useAuthRedirect()

    useEffect(() => {
        // Skip if still loading
        if (loading) return

        // Debug untuk kelas routes
        if (typeof window !== 'undefined' && window.location.pathname.includes('/kelas')) {
            console.log('🔍 RoleGuard kelas route check:', {
                isAuthenticated,
                hasAccess,
                userRole,
                allowedRoles,
                loading,
                pathname: window.location.pathname
            })
        }

        // Jika tidak loading dan user belum login, redirect ke halaman login
        if (!isAuthenticated) {
            console.log('🔍 RoleGuard: User not authenticated, redirecting to login')
            redirectTo('/login')
            return
        }

        // Jika user sudah login tapi role tidak diizinkan, redirect sesuai role
        if (isAuthenticated && !hasAccess && userRole) {
            console.log('🔍 RoleGuard: Access denied, redirecting to appropriate dashboard')
            if (fallbackPath) {
                redirectTo(fallbackPath)
            } else {
                redirectToDashboard(userRole as UserRole)
            }
        }
    }, [isAuthenticated, loading, hasAccess, userRole, redirectTo, redirectToDashboard, fallbackPath])

    // Loading state
    if (loading) {
        return <QuickRedirectLoader />
    }

    // User belum login
    if (!isAuthenticated) {
        return <QuickRedirectLoader /> // Redirect ke login
    }

    // Role tidak diizinkan - tampilkan loader karena akan segera redirect
    if (!hasAccess) {
        return <QuickRedirectLoader />
    }

    // Semua pengecekan berhasil, render children
    return <>{children}</>
})
RoleGuard.displayName = 'RoleGuard'

// Specific guards untuk kemudahan penggunaan
export const GuruOnlyGuard = memo(({ children }: { children: ReactNode }) => (
    <RoleGuard allowedRoles={['guru']}>
        {children}
    </RoleGuard>
))
GuruOnlyGuard.displayName = 'GuruOnlyGuard'

export const SiswaOnlyGuard = memo(({ children }: { children: ReactNode }) => (
    <RoleGuard allowedRoles={['siswa']}>
        {children}
    </RoleGuard>
))
SiswaOnlyGuard.displayName = 'SiswaOnlyGuard'

// Guard untuk halaman yang bisa diakses oleh kedua role
export const AuthenticatedGuard = memo(({ children }: { children: ReactNode }) => (
    <RoleGuard allowedRoles={['guru', 'siswa']}>
        {children}
    </RoleGuard>
))
AuthenticatedGuard.displayName = 'AuthenticatedGuard'