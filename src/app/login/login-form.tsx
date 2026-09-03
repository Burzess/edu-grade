'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/providers/auth-provider"
import { getDashboardPathForRole } from "@/lib/auth/dashboard-path"
import { isUserRole, ROLES } from "@/types/auth"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2, Info } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MiddlewareErrorHandler } from "@/components/auth/middleware-error-handler"
import { SessionExpiredHandler } from "@/components/auth/session-expired-handler"

const loginSchema = z.object({
    email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
})

type LoginForm = z.infer<typeof loginSchema>

/**
 * Translate Supabase auth error messages to Indonesian.
 */
function translateAuthError(message: string): string {
    const errorMap: Record<string, string> = {
        'Invalid login credentials': 'Email atau kata sandi salah. Periksa kembali data akun Anda.',
        'invalid_grant': 'Email atau kata sandi salah. Periksa kembali data akun Anda.',
        'Email not confirmed': 'Email belum dikonfirmasi. Silakan periksa inbox atau spam pada email Anda.',
        'User is banned': 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
        'user_banned': 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.',
        'User not found': 'Akun dengan email tersebut tidak ditemukan.',
        'Too many requests': 'Terlalu banyak percobaan login. Silakan tunggu beberapa saat.',
        'Email rate limit exceeded': 'Batas pengiriman email tercapai. Coba lagi nanti.',
        'Signup disabled': 'Pendaftaran akun tidak tersedia saat ini.',
        'Password should be at least 6 characters': 'Password minimal 6 karakter.',
        'fetch failed': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
        'Failed to fetch': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
        'NetworkError': 'Terjadi gangguan jaringan. Periksa koneksi internet Anda.',
        'Auth session missing': 'Sesi autentikasi tidak ditemukan. Silakan login kembali.',
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
    const [infoMessage, setInfoMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const { signIn } = useAuth()
    const searchParams = useSearchParams()

    // Check for error/message from callback or middleware
    useEffect(() => {
        const errorParam = searchParams.get('error')
        const messageParam = searchParams.get('message')
        
        if (messageParam && !errorParam) {
            setInfoMessage(messageParam)
        }

        if (errorParam) {
            switch (errorParam) {
                case 'auth_callback_error':
                    setError('Terjadi kesalahan saat konfirmasi email. Silakan coba login ulang.')
                    break
                case 'middleware_error':
                    // Ditangani oleh MiddlewareErrorHandler khusus error sistem
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

    // Clear error when user edits fields
    useEffect(() => {
        const subscription = form.watch(() => {
            if (error) setError(null)
            if (infoMessage) setInfoMessage(null)
        })
        return () => subscription.unsubscribe()
    }, [form, error, infoMessage])

    const onSubmit = async (data: LoginForm) => {
        try {
            setLoading(true)
            setError(null)
            setInfoMessage(null)

            const result = await signIn(data.email, data.password)

            // Ambil role dari profile yang sudah di-fetch dari database (lebih aman)
            const profileRole = result?.profile?.role
            const userRole = isUserRole(profileRole) ? profileRole : ROLES.SISWA
            const dashboardPath = getDashboardPathForRole(userRole)
            
            // Cek parameter redirect yang aman dan sesuai role
            const redirectParam = searchParams.get('redirect')
            let targetPath: string = dashboardPath

            if (redirectParam && redirectParam.startsWith('/')) {
                const isRoleMatch =
                    (userRole === ROLES.ADMIN) ||
                    (userRole === ROLES.GURU && redirectParam.startsWith('/guru')) ||
                    (userRole === ROLES.SISWA && redirectParam.startsWith('/siswa'))

                if (isRoleMatch && !redirectParam.startsWith('/login') && !redirectParam.startsWith('/auth')) {
                    targetPath = redirectParam
                }
            }

            // Gunakan window.location.href agar cookie sesi dan header tersinkronisasi penuh
            window.location.href = targetPath

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Terjadi kesalahan saat login"
            // Translate common Supabase auth error messages
            const translatedMessage = translateAuthError(message)
            setError(translatedMessage)
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
                        {infoMessage && !error && (
                            <Alert className="mb-4 border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertDescription>{infoMessage}</AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert className="mb-4" variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                                                disabled={loading}
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
                                            <div className="relative">
                                                <Input
                                                    type={isPasswordVisible ? "text" : "password"}
                                                    placeholder="Masukkan password"
                                                    className="pr-10"
                                                    disabled={loading}
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setIsPasswordVisible((value) => !value)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                                    aria-label={isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"}
                                                    title={isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"}
                                                    disabled={loading}
                                                >
                                                    {isPasswordVisible ? (
                                                        <EyeOff className="h-4 w-4" />
                                                    ) : (
                                                        <Eye className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Memproses...
                                    </span>
                                ) : (
                                    "Masuk"
                                )}
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
