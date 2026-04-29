'use client'

import { Button } from "@/components/ui/button"

import { AuthRedirectGuard } from "@/components/auth/role-guard"
import { useIsAuthenticated } from "@/store/auth"
import {
  ArrowRight,
  BookOpen,
  Bot,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface FeatureItem {
  icon: LucideIcon
  title: string
  description: string
}

const FEATURE_ITEMS: FeatureItem[] = [
  {
    icon: Bot,
    title: "Penilaian AI Adaptif",
    description:
      "Essay dinilai otomatis dengan feedback terstruktur agar guru dapat fokus pada pendampingan belajar.",
  },
  {
    icon: ShieldCheck,
    title: "Ujian Lebih Aman",
    description:
      "Kontrol keamanan ujian digital membantu menjaga integritas proses evaluasi di setiap kelas.",
  },
  {
    icon: Users,
    title: "Kolaborasi Guru dan Siswa",
    description:
      "Dashboard terpisah untuk guru dan siswa membuat alur mengajar, mengerjakan, dan menilai jadi lebih rapi.",
  },
]

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background selection:bg-primary/20">
      {/* Floating Header */}
      <div className="relative z-50 w-full pt-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo & Identity */}
            <div className="flex items-center gap-3">
              <div className="relative flex shrink-0 items-center justify-center overflow-hidden bg-transparent">
                <Image
                  src="/logo-smkm1-PNG.png"
                  alt="Logo SMK Muhammadiyah 1 Surabaya"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground sm:text-base drop-shadow-sm">
                SMK Muhammadiyah 1 Surabaya
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative container mx-auto px-4 pb-14 pt-16 md:pb-20 md:pt-24 lg:pt-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Selamat Datang di
              <span className="mt-2 block text-primary">
                Edu-Grade Center of Excellence
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:mt-8 md:text-xl">
              Platform evaluasi pembelajaran yang dirancang untuk mendukung semangat sekolah kreatif,
              disiplin, dan berprestasi. Proses ujian digital, umpan balik AI, dan monitoring hasil
              disatukan dalam satu alur yang cepat dan akurat.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row sm:items-center md:mt-10">
              <Button asChild size="lg" className="group h-12 px-8 text-base shadow-md">
                <Link href="/login">
                  Masuk ke Edu-Grade
                  <ArrowRight className="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                <a href="#fitur">Lihat Fitur</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur Section */}
      <section id="fitur" className="relative py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Dirancang untuk ritme belajar modern
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Setiap fitur dibangun agar proses evaluasi lebih efisien, transparan, dan mendorong kualitas
              pembelajaran di kelas.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-3 lg:gap-10">
            {FEATURE_ITEMS.map((feature, index) => {
              const Icon = feature.icon
              
              // Tentukan warna icon berdasarkan indeks untuk variasi visual
              const iconColors = [
                "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
              ]
              
              const colorClass = iconColors[index % iconColors.length]

              return (
                <div
                  key={feature.title}
                  className="group relative flex flex-col items-center text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className={`mb-6 flex size-16 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${colorClass}`}>
                    <Icon className="size-8" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
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
