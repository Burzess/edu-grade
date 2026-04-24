'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthRedirectGuard } from "@/components/auth/role-guard"
import { useIsAuthenticated } from "@/store/auth"
import {
  ArrowRight,
  BookOpen,
  Bot,
  GraduationCap,
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
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(27,79,158,0.18),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(245,197,24,0.2),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(0,184,212,0.14),transparent_35%)]" />

      <section className="relative container mx-auto px-4 pb-14 pt-10 md:pb-20 md:pt-14 lg:pb-24 lg:pt-20">
        <div className="mx-auto max-w-5xl">
          <div className="min-w-0 animate-in fade-in-0 slide-in-from-bottom-4 text-center duration-700">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary md:text-sm">
              <GraduationCap className="size-4" />
              SMK Muhammadiyah 1 Surabaya
            </div>

            <h1 className="mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Selamat Datang di
              <span className="block bg-gradient-to-r from-brand-700 via-brand-500 to-gold-400 bg-clip-text text-transparent">
                Edu-Grade Center of Excellence
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground md:mt-6 md:text-lg">
              Platform evaluasi pembelajaran yang dirancang untuk mendukung semangat sekolah kreatif,
              disiplin, dan berprestasi. Proses ujian digital, umpan balik AI, dan monitoring hasil
              disatukan dalam satu alur yang cepat dan akurat.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:items-center md:mt-10">
              <Button asChild size="lg" className="group text-sm md:text-base">
                <Link href="/login">
                  Masuk ke Edu-Grade
                  <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
              <a
                href="#fitur"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Lihat Fitur
              </a>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-3 md:mt-10">
            <div className="rounded-lg border border-border/80 bg-card/80 px-3 py-2 backdrop-blur-sm">
              <p className="font-semibold text-foreground">AI Feedback</p>
              <p>Lebih cepat dan terukur</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-card/80 px-3 py-2 backdrop-blur-sm">
              <p className="font-semibold text-foreground">Keamanan Ujian</p>
              <p>Monitoring terintegrasi</p>
            </div>
            <div className="rounded-lg border border-border/80 bg-card/80 px-3 py-2 backdrop-blur-sm">
              <p className="font-semibold text-foreground">Dashboard Role</p>
              <p>Alur guru dan siswa</p>
            </div>
          </div>

          <Card className="mt-10 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-[1.05fr_0.95fr]">
                <div className="aspect-[16/10] md:aspect-auto">
                  <Image
                    src="/school-of-creativepreneur-768x432.webp"
                    alt="Suasana sekolah kreatif SMK Muhammadiyah 1 Surabaya"
                    width={768}
                    height={432}
                    className="h-full w-full object-cover"
                    priority
                  />
                </div>

                <div className="flex flex-col gap-5 p-6 md:p-8">
                  <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <Sparkles className="size-4 text-gold-500" />
                      Sekolah Berbasis Inovasi
                    </p>
                    <h3 className="text-xl font-semibold text-foreground md:text-2xl">
                      Ekosistem Digital untuk Guru dan Siswa
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                      Penilaian otomatis, pemantauan progres, dan umpan balik pembelajaran terintegrasi
                      dalam satu platform yang rapi dan mudah dipakai.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border border-border bg-muted/70 p-3">
                      <p className="text-xs text-muted-foreground">Mode Ujian</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Essay & Objektif</p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/70 p-3">
                      <p className="text-xs text-muted-foreground">Status Penilaian</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Real-Time</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="fitur" className="relative border-y border-border/70 bg-card/60 py-14 backdrop-blur-sm md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="size-4" />
              Fitur Utama Edu-Grade
            </p>
            <h2 className="text-2xl font-bold text-foreground md:text-4xl">
              Dirancang untuk ritme belajar sekolah modern
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              Setiap fitur dibangun agar proses evaluasi lebih efisien, transparan, dan mendorong kualitas
              pembelajaran di kelas.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {FEATURE_ITEMS.map((feature, index) => {
              const Icon = feature.icon

              return (
                <Card
                  key={feature.title}
                  className="group animate-in fade-in-0 slide-in-from-bottom-4 border-2 border-border duration-500 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <CardHeader className="space-y-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-md bg-accent text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg text-foreground transition-colors duration-200 group-hover:text-primary">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed md:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border/70 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 py-10 text-white md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-white/15 p-1.5 backdrop-blur-sm">
                  <Image
                    src="/logo-smkm1-PNG.png"
                    alt="Logo SMK Muhammadiyah 1 Surabaya"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-sm font-semibold tracking-wide text-white/90 md:text-base">
                  SMK Muhammadiyah 1 Surabaya
                </p>
              </div>
              <p className="max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
                Edu-Grade mendukung visi sekolah untuk melahirkan lulusan kreatif, adaptif, dan siap
                berkarier dengan sistem evaluasi pembelajaran berbasis teknologi.
              </p>
            </div>

            <div className="md:justify-self-end">
              <div className="mt-3 flex flex-col gap-2 text-sm text-white/85">
                <span>Center of Excellence School</span>
                <span>JL. Kapasan No. 73-75, Surabaya</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
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
