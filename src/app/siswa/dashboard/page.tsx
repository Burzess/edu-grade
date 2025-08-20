'use client'

import Link from 'next/link'
import { useAvailableUjian, useCompletedUjianSiswa, useCompletedUjianIds } from '@/hooks/use-jawaban'
import { useDashboardStatsSiswa, useRecentActivitySiswa, useAvailableUjianForSiswaDashboard } from '@/hooks/use-dashboard-siswa'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationBanner } from '@/components/notifications/notification-banner'
import { useAuthStore } from "@/store/auth"
import { useAuth } from "@/components/providers/auth-provider"
import {
  BookOpen,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Trophy,
  LogOut,
  Activity,
  TrendingUp,
  Play,
  Award
} from 'lucide-react'
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'
import { id } from 'date-fns/locale'
import { SiswaOnlyGuard } from '@/components/auth/role-guard'

interface UjianCardProps {
  ujian: any
  type: 'active' | 'completed'
}

// Component untuk menampilkan aktivitas siswa
function ActivityItemSiswa({ activity }: { activity: any }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'mulai_ujian':
        return { icon: Play, color: 'text-blue-600', bgColor: 'bg-blue-50' }
      case 'selesai_ujian':
        return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' }
      case 'ujian_berlangsung':
        return { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50' }
      case 'kirim_jawaban':
        return { icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' }
      default:
        return { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-50' }
    }
  }

  const { icon: Icon, color, bgColor } = getActivityIcon(activity.type)
  
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-full ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {activity.title}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {activity.description}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {format(activity.time, 'dd MMM, HH:mm', { locale: id })}
        </p>
      </div>
      {activity.ujianId && activity.type === 'ujian_berlangsung' && (
        <Link href={`/siswa/ujian/${activity.ujianId}`}>
          <Button size="sm" variant="outline" className="text-xs">
            Lanjutkan
          </Button>
        </Link>
      )}
    </div>
  )
}

function UjianCard({ ujian, type }: UjianCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`
    }
    return `${mins} menit`
  }

  const getTimeStatus = () => {
    // For duration-based system, check if ujian is active and within time bounds
    if (ujian.status === 'completed') {
      return {
        status: 'completed',
        message: 'Ujian selesai',
        color: 'bg-gray-100 text-gray-800'
      }
    }

    // For active ujian, check time bounds
    if (ujian.status === 'active') {
      if (!ujian.start_time) {
        return {
          status: 'active',
          message: 'Sedang berlangsung',
          color: 'bg-green-100 text-green-800'
        }
      }

      const now = new Date()
      const startTime = new Date(ujian.start_time)
      const endTime = ujian.end_time ? new Date(ujian.end_time) : new Date(startTime.getTime() + (ujian.duration_minutes || 60) * 60 * 1000)

      if (isBefore(now, startTime)) {
        return {
          status: 'upcoming',
          message: `Dimulai ${formatDistanceToNow(startTime, { addSuffix: true, locale: id })}`,
          color: 'bg-blue-100 text-blue-800'
        }
      } else if (isAfter(now, endTime)) {
        return {
          status: 'ended',
          message: 'Waktu habis',
          color: 'bg-red-100 text-red-800'
        }
      } else {
        return {
          status: 'active',
          message: `Berakhir ${formatDistanceToNow(endTime, { addSuffix: true, locale: id })}`,
          color: 'bg-green-100 text-green-800'
        }
      }
    }

    return null
  }

  const timeStatus = getTimeStatus()
  const soalCount = ujian.total_questions

  if (type === 'active') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{ujian.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
            </div>
            <Badge
              className={
                ujian.status === 'active'
                  ? "bg-green-100 text-green-800"
                  : ujian.status === 'draft'
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
              }
              variant="secondary"
            >
              {ujian.status === 'active' ? 'Aktif' : ujian.status === 'draft' ? 'Menunggu' : 'Selesai'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Info Guru dan Waktu */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Guru:</span>
              <span>{ujian.teacher_name || 'Tidak diketahui'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Durasi:</span>
              <span>{formatDuration(ujian.duration_minutes || 60)}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Soal:</span>
              <span>{soalCount} pertanyaan</span>
            </div>

            {timeStatus && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <Badge className={timeStatus.color} variant="secondary">
                  {timeStatus.message}
                </Badge>
              </div>
            )}
          </div>

            {/* Tombol Mulai */}
            <div className="pt-2">
              {ujian.status === 'active' && timeStatus?.status === 'active' ? (
                <Button asChild className="w-full">
                  <Link href={`/siswa/ujian/${ujian.id || ujian.exam_id}`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Mulai Ujian
                  </Link>
                </Button>
              ) : ujian.status === 'draft' ? (
                <Button className="w-full" disabled>
                  <Clock className="h-4 w-4 mr-2" />
                  Menunggu Guru Memulai
                </Button>
              ) : timeStatus?.status === 'ended' ? (
                <Button className="w-full" disabled>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Waktu Habis
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Tidak Tersedia
                </Button>
              )}
            </div>          {/* Info Waktu */}
          <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
            {ujian.status === 'draft' && (
              <div className="text-yellow-600 bg-yellow-50 p-2 rounded text-center">
                <Clock className="h-4 w-4 inline mr-1" />
                Ujian belum dimulai oleh guru
              </div>
            )}

            {ujian.start_time && (
              <div>
                Dimulai: {format(new Date(ujian.start_time), 'dd MMM yyyy, HH:mm', { locale: id })}
              </div>
            )}

            {ujian.end_time ? (
              <div>
                Berakhir: {format(new Date(ujian.end_time), 'dd MMM yyyy, HH:mm', { locale: id })}
              </div>
            ) : ujian.start_time && (
              <div>
                Berakhir: {format(new Date(new Date(ujian.start_time).getTime() + (ujian.duration_minutes || 60) * 60 * 1000), 'dd MMM yyyy, HH:mm', { locale: id })}
              </div>
            )}

            {!ujian.start_time && ujian.status === 'active' && (
              <div className="text-green-600">
                Ujian sudah dimulai, silakan klik "Mulai Ujian"
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Completed exam card
  if (type === 'completed') {
    if (!ujian.id) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <div>
                <div className="font-medium">Data Ujian Tidak Valid</div>
                <div className="text-sm">Ujian mungkin telah dihapus atau data rusak</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{ujian.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
            </div>
            <Badge className="bg-blue-100 text-blue-800" variant="secondary">
              Selesai
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score info */}
          {ujian.averageScore !== null && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Nilai:</span>
              <Badge variant="outline" className="font-bold">
                {ujian.averageScore}/100
              </Badge>
            </div>
          )}

          {/* Info */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Guru:</span>
              <span>{ujian.profiles?.[0]?.full_name || 'Tidak diketahui'}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Dikerjakan:</span>
              <span>{format(new Date(ujian.lastAttempt), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Jawaban:</span>
              <span>{ujian.gradedAnswers}/{ujian.totalAnswers} dinilai</span>
            </div>
          </div>

          {/* Detail Button */}
          <div className="pt-2">
            <Button variant="outline" asChild className="w-full">
              <Link href={`/siswa/hasil/${ujian.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Lihat Detail
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // For any invalid data
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          <div>
            <div className="font-medium">Data Ujian Tidak Valid</div>
            <div className="text-sm">Tipe ujian tidak dikenali</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UjianSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export default function SiswaDashboard() {
  const { profile } = useAuthStore()
  const { signOut } = useAuth()
  
  // Hooks lama untuk backward compatibility
  const { data: availableUjian = [], isLoading: isLoadingAvailable } = useAvailableUjian()
  const { data: completedUjian = [], isLoading: isLoadingCompleted } = useCompletedUjianSiswa()
  const { data: completedIds = [] } = useCompletedUjianIds()
  
  // Hooks baru untuk dashboard yang lebih informatif
  const { data: dashboardStats, isLoading: isStatsLoading } = useDashboardStatsSiswa()
  const { data: recentActivity = [], isLoading: isActivityLoading } = useRecentActivitySiswa()
  const { data: availableUjianDashboard = [], isLoading: isAvailableLoading } = useAvailableUjianForSiswaDashboard()

  return (
    <SiswaOnlyGuard >
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Edu-Grade - Dashboard Siswa
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.full_name || 'Siswa'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email || 'Email tidak tersedia'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">
              Selamat datang, {profile?.full_name || 'Siswa'}!
            </h2>
            <p className="text-blue-100">
              Ikuti ujian yang tersedia dan pantau perkembangan belajar Anda
            </p>
          </div>

          {/* Notification Banner */}
          <NotificationBanner />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ujian Aktif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableUjian.filter(u => u.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">Siap untuk dikerjakan</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ujian Draft</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableUjian.filter(u => u.status === 'draft').length}</div>
                <p className="text-xs text-muted-foreground">Belum diaktifkan guru</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ujian Dikerjakan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedUjian.length}</div>
                <p className="text-xs text-muted-foreground">Sudah dikerjakan</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">
                <BookOpen className="h-4 w-4 mr-2" />
                Ujian Aktif ({availableUjian.filter(u => u.status === 'active').length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ujian Dikerjakan ({completedUjian.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {isLoadingAvailable ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <UjianSkeleton key={`active-skeleton-${i}`} />
                  ))}
                </div>
              ) : (
                <>
                  {availableUjian.length === 0 ? (
                    <div className="text-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg mb-2">
                        Belum ada ujian yang tersedia
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tunggu guru Anda untuk membuat ujian
                      </p>
                    </div>
                  ) : availableUjian.filter(u => u.status === 'active').length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg mb-2">
                        Belum ada ujian aktif
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Ada {availableUjian.length} ujian tersedia, tetapi belum diaktifkan oleh guru
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {availableUjian.filter(u => u.status === 'active').map((ujian) => (
                        <UjianCard
                          key={ujian.exam_id || ujian.id}
                          ujian={ujian}
                          type="active"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              {isLoadingCompleted ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <UjianSkeleton key={`completed-skeleton-${i}`} />
                  ))}
                </div>
              ) : completedUjian.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">
                    Belum ada ujian yang diselesaikan
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Mulai kerjakan ujian yang tersedia untuk melihat hasil di sini
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedUjian
                    .filter((ujian: any) => ujian && ujian.id)
                    .map((ujian: any, index: number) => (
                      
                      <UjianCard
                        key={ujian.id}
                        ujian={ujian}
                        type="completed"
                      />
                    ))
                  }
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
    </SiswaOnlyGuard>
  )
}
