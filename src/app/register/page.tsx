'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/providers/auth-provider"
import { AuthRedirectGuard } from "@/components/auth/role-guard"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

const registerSchema = z.object({
    email: z.string().email("Email tidak valid"),
    password: z.string().min(6, "Password minimal 6 karakter"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const { signUp } = useAuth()
    const router = useRouter()

    const form = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
            fullName: "",
        },
    })

    const onSubmit = async (data: RegisterForm) => {
        try {
            setLoading(true)
            setError(null)

            const result = await signUp(data.email, data.password, data.fullName, "siswa")

            if (result.user && !result.session) {
                // Email confirmation required
                setSuccess(true)
            } else if (result.session) {
                // Auto logged in (email confirmation disabled)
                router.push('/')
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan saat mendaftar")
        } finally {
            setLoading(false)
        }
    }

  if (success) {
    return (
      <AuthRedirectGuard>
        <div className="min-h-screen flex items-center justify-center bg-background relative">
          
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-green-600">
                Pendaftaran Berhasil!
              </CardTitle>
              <CardDescription className="text-center">
                Silakan cek email Anda untuk konfirmasi akun.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>📧 Kami telah mengirimkan link konfirmasi ke email Anda.</p>
                <p>🔗 Klik link tersebut untuk mengaktifkan akun.</p>
                <p>⏰ Setelah konfirmasi, Anda bisa langsung masuk.</p>
              </div>
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Kembali ke Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuthRedirectGuard>
    )
  }

  return (
    <AuthRedirectGuard>
        <div className="min-h-screen flex items-center justify-center bg-background relative">
            
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        Daftar ke Edu-Grade
                    </CardTitle>
                    <CardDescription className="text-center">
                        Buat akun siswa untuk mulai menggunakan platform
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
                                name="fullName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Lengkap</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Masukkan nama lengkap"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

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

                            {/* <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Peran</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih peran Anda" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="siswa">Siswa</SelectItem>
                                                <SelectItem value="guru">Guru</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            /> */}

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Minimal 6 karakter"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Konfirmasi Password</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder="Ulangi password"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Memproses..." : "Daftar sebagai Siswa"}
                            </Button>
                        </form>
                    </Form>

                    {/* <div className="mt-4 text-center text-xs text-muted-foreground">
                        Akun guru dibuat oleh administrator sekolah
                    </div> */}

                    <div className="mt-4 text-center text-sm">
                        Sudah punya akun?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Masuk di sini
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    </AuthRedirectGuard>
  )
}
