'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthRedirectGuard } from "@/components/auth/role-guard"
import { useIsAuthenticated } from "@/store/auth"
import Link from "next/link"

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 relative">      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Selamat Datang di <span className="text-primary">Edu-Grade</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Platform pembelajaran modern dengan sistem penilaian otomatis menggunakan AI
            untuk membantu guru dan siswa dalam proses belajar mengajar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-primary">👨‍🏫 Untuk Guru</CardTitle>
              <CardDescription>
                Kelola soal, ujian, dan nilai siswa dengan mudah
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Buat dan kelola bank soal essay</li>
                <li>• Susun ujian dengan berbagai soal</li>
                <li>• Penilaian otomatis dengan AI</li>
                <li>• Lihat hasil dan berikan feedback</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">👨‍🎓 Untuk Siswa</CardTitle>
              <CardDescription>
                Kerjakan ujian dan dapatkan feedback instan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Akses ujian yang tersedia</li>
                <li>• Kerjakan soal essay dengan mudah</li>
                <li>• Dapatkan penilaian otomatis</li>
                <li>• Lihat hasil dan feedback detail</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Mulai gunakan Edu-Grade sekarang</p>
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
    <div className="min-h-screen bg-background relative">
      
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="text-muted-foreground mb-6">
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
