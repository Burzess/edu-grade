'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthRedirectGuard } from "@/components/auth/role-guard"
import { useIsAuthenticated } from "@/store/auth"
import Link from "next/link"

function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blur-900 relative">      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground dark:text-white mb-4">
            Selamat Datang di <span className="text-blue-500 dark:text-blue-600">Edu-Grade</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto dark:text-blue-100">
            Platform ujian modern dengan sistem penilaian otomatis menggunakan AI
            untuk membantu guru dan siswa dalam proses belajar mengajar.
          </p>
        </div>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground dark:text-blue-100">Mulai gunakan Edu-Grade sekarang</p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/login">Masuk</Link>
            </Button>
            {/* <Button asChild variant="outline" size="lg">
              <Link href="/register">Daftar</Link>
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  )
}

function AuthenticatedHomePage() {
  // Default authenticated home - redirect ke dashboard sesuai role
  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-blue-950 relative">
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4 text-foreground dark:text-white">Dashboard</h1>
          <p className="text-muted-foreground mb-6 dark:text-blue-100">
            Selamat datang di dashboard Edu-Grade
          </p>
          <div className="space-x-4">
            <Button asChild>
              <Link href="/guru/dashboard">Dashboard Guru</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/siswa/dashboard">Dashboard Siswa</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const isAuthenticated = useIsAuthenticated()

  return (
    <AuthRedirectGuard>
      {isAuthenticated ? <AuthenticatedHomePage /> : <LandingPage />}
    </AuthRedirectGuard>
  )
}
