'use client'

import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Shield } from 'lucide-react'

interface RoleGuardProps {
    children: ReactNode
    allowedRoles: ('guru' | 'siswa')[]
    fallbackPath?: string
}

// Guard untuk mencegah user yang sudah login mengakses halaman login/register
export function AuthRedirectGuard({ children }: { children: ReactNode }) {
    const { user, profile, loading } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        const role = user?.user_metadata?.role;
        if (!loading && user && profile) {
            // Redirect ke dashboard sesuai role
            if (role === 'guru') {
                router.replace('/guru/dashboard');
            } else if (role === 'siswa') {
                router.replace('/siswa/dashboard');
            } else {
                router.replace('/');
            }
        }
    }, [user, profile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-muted-foreground">Mengecek apakah sudah login</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Jika belum login, render children (halaman login/register)
    if (!user || !profile) {
        return <>{children}</>;
    }

    // Jika sudah login, tampilan kosong karena akan redirect
    return null;
}

export function RoleGuard({ children, allowedRoles, fallbackPath }: RoleGuardProps) {
    const { user, profile, loading } = useAuthStore()
    const router = useRouter()

    useEffect(() => {
        if (!loading && user && profile) {
            // Check if user role is allowed
            if (!allowedRoles.includes(profile.role as 'guru' | 'siswa')) {
                // Redirect to appropriate dashboard or fallback
                if (profile.role === 'guru') {
                    router.push(fallbackPath || '/guru/dashboard')
                } else if (profile.role === 'siswa') {
                    router.push(fallbackPath || '/siswa/dashboard')
                } else {
                    router.push(fallbackPath || '/')
                }
            }
        }
    }, [user, profile, loading, allowedRoles, router, fallbackPath])

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-muted-foreground">Memverifikasi akses...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Not authenticated
    if (!user) {
        router.push('/login')
        return null
    }

    // No profile loaded yet
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-muted-foreground">Memuat profil pengguna...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // User role not allowed
    if (!allowedRoles.includes(profile.role as 'guru' | 'siswa')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <Shield className="h-12 w-12 text-red-500" />
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Akses Ditolak</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Anda tidak memiliki izin untuk mengakses halaman ini.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Role Anda: <span className="font-medium">{profile.role}</span>
                                </p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Mengarahkan ke dashboard yang sesuai...
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // All checks passed, render children
    return <>{children}</>
}

// Specific guards for common use cases
export function GuruOnlyGuard({ children }: { children: ReactNode }) {
    return (
        <RoleGuard allowedRoles={['guru']} fallbackPath="/siswa/dashboard">
            {children}
        </RoleGuard>
    )
}

export function SiswaOnlyGuard({ children }: { children: ReactNode }) {
    return (
        <RoleGuard allowedRoles={['siswa']} fallbackPath="/guru/dashboard">
            {children}
        </RoleGuard>
    )
}
