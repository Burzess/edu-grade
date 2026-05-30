'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/providers/auth-provider"
import { getDashboardPathForRole } from "@/lib/auth/dashboard-path"
import { isUserRole, ROLES } from "@/types/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MiddlewareErrorHandler } from "@/components/auth/middleware-error-handler"
import { SessionExpiredHandler } from "@/components/auth/session-expired-handler"

const loginSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
})

type LoginForm = z.infer<typeof loginSchema>

/**
 * Translate Supabase auth error messages to Indonesian.
 */
function translateAuthError(message: string): string {
    const errorMap: Record<string, string> = {
        'Invalid login credentials': 'Email atau password salah',
        'Email not confirmed': 'Email belum dikonfirmasi. Silakan cek inbox Anda.',
        'User is banned': 'Akun Anda telah dinonaktifkan. Hubungi administrator.',
        'User not found': 'Pengguna tidak ditemukan',
        'Too many requests': 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
        'Email rate limit exceeded': 'Batas pengiriman email tercapai. Coba lagi nanti.',
        'Signup disabled': 'Pendaftaran tidak tersedia saat ini.',
        'Password should be at least 6 characters': 'Password minimal 6 karakter',
    }

    for (const [english, indonesian] of Object.entries(errorMap)) {
        if (message.toLowerCase().includes(english.toLowerCase())) {
            return indonesian
        }
    }

    return message
}

export default function LoginForm() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const { signIn } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()

    // Check for error from callback or middleware
    useEffect(() => {
        const errorParam = searchParams.get('error')
        const messageParam = searchParams.get('message')
        
        if (errorParam) {
            switch (errorParam) {
                case 'auth_callback_error':
                    setError('Terjadi kesalahan saat konfirmasi email. Silakan coba login ulang.')
                    break
                case 'middleware_error':
                    setError(messageParam || 'Terjadi kesalahan sistem. Silakan coba lagi.')
                    break
                case 'auth_timeout':
                    setError(messageParam || 'Timeout saat verifikasi session. Silakan login kembali.')
                    break
                case 'network_error':
                    setError(messageParam || 'Koneksi bermasalah. Periksa internet Anda.')
                    break
                case 'session_expired':
                    setError('Session telah berakhir. Silakan login kembali.')
                    break
                case 'access_denied':  
                    setError('Akses ditolak. Silakan login dengan akun yang sesuai.')
                    break
                default:
                    setError(messageParam || 'Terjadi kesalahan. Silakan coba lagi.')
            }
        }
    }, [searchParams])

    const form = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = async (data: LoginForm) => {
        try {
            setLoading(true)
            setError(null)

            const result = await signIn(data.email, data.password)

            // Ambil role dari profile yang sudah di-fetch dari database (lebih aman)
            // Profile diambil dari database, bukan dari user_metadata yang bisa dimanipulasi
            const profileRole = result?.profile?.role
            const userRole = isUserRole(profileRole) ? profileRole : ROLES.SISWA
            const dashboardPath = getDashboardPathForRole(userRole)
            
            // Langsung redirect ke dashboard yang sesuai tanpa delay
            router.replace(dashboardPath)

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan saat login"
            // Translate common Supabase auth error messages
            const translatedMessage = translateAuthError(message)
            setError(translatedMessage)
        } finally {
            setLoading(false)
        }
    }

    // Check if this is a session-related error that needs special handling
    const errorParam = searchParams.get('error')
    const isSessionError = ['session_expired', 'auth_timeout', 'auth_required'].includes(errorParam || '')
    
    if (isSessionError) {
        return <SessionExpiredHandler />
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background relative">
            <div className="w-full max-w-md space-y-4">
                {/* Middleware Error Handler */}
                <MiddlewareErrorHandler />
                
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center">
                            Masuk ke Edu-Grade
                        </CardTitle>
                        <CardDescription className="text-center">
                            Masukkan email dan password untuk mengakses akun Anda
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert className="mb-4" variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="nama@email.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Masukkan password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Memproses..." : "Masuk"}
                            </Button>
                        </form>
                    </Form>

                    <div className="mt-6 space-y-3">
                        <div className="text-center text-sm text-muted-foreground">
                            Hubungi administrator untuk pembuatan akun baru.
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    )
}
