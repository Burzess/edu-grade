'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  BookOpen,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Trophy,
  School,
  GraduationCap,
  Play,
  RotateCcw,
} from 'lucide-react'
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'
import { id } from 'date-fns/locale'

interface UjianCardProps {
  ujian: any
  type: 'active' | 'completed'
}

interface KelasDetail {
  id: string
  nama_kelas: string
  kode_kelas: string
  guru_name: string
  joined_at: string
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
    if (ujian.status === 'completed') {
      return {
        status: 'completed',
        message: 'Ujian selesai',
        color: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
      }
    }

    if (ujian.status === 'active') {
      if (!ujian.start_time) {
        return {
          status: 'active',
          message: 'Sedang berlangsung',
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        }
      }

      const now = new Date()
      const startTime = new Date(ujian.start_time)
      const endTime = ujian.end_time ? new Date(ujian.end_time) : new Date(startTime.getTime() + (ujian.duration_minutes || 60) * 60 * 1000)

      if (isBefore(now, startTime)) {
        return {
          status: 'upcoming',
          message: `Dimulai ${formatDistanceToNow(startTime, { addSuffix: true, locale: id })}`,
          color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300'
        }
      } else if (isAfter(now, endTime)) {
        return {
          status: 'ended',
          message: 'Waktu habis',
          color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        }
      } else {
        return {
          status: 'active',
          message: `Berakhir ${formatDistanceToNow(endTime, { addSuffix: true, locale: id })}`,
          color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        }
      }
    }

    return null
  }

  const teacherName = ujian.profiles?.full_name || ujian.guru_name || 'Tidak diketahui'
  const timeStatus = getTimeStatus()
  const soalCount = ujian.total_questions || 0

  if (type === 'active') {
    return (
      <Card className="bg-white dark:bg-card hover:shadow-md transition-shadow">
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
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                  : ujian.status === 'draft'
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
              }
              variant="secondary"
            >
              {ujian.status === 'active' ? 'Aktif' : ujian.status === 'draft' ? 'Menunggu' : 'Selesai'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Guru:</span>
              <span>{teacherName}</span>
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

          <div className="pt-2">
            {ujian.status === 'active' && timeStatus?.status === 'active' ? (
              <Button asChild className={`w-full ${ujian.is_remidi ? 'bg-orange-600 hover:bg-orange-700' : ''}`}>
                <Link href={`/siswa/ujian/${ujian.id || ujian.exam_id}${ujian.is_remidi ? '?remidi=true' : ''}`}>
                  {ujian.is_remidi ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Mulai Remidi (Percobaan {ujian.current_attempt}{ujian.max_attempts === 0 ? '' : `/${ujian.max_attempts}`})
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Mulai Ujian
                    </>
                  )}
                </Link>
              </Button>
            ) : ujian.status === 'draft' ? (
              <Button className="w-full" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Menunggu Soal
              </Button>
            ) : timeStatus?.status === 'upcoming' ? (
              <Button className="w-full" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Belum Dimulai
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
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
            {ujian.status === 'draft' && (
              <div className="text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-center">
                <Clock className="h-4 w-4 inline mr-1" />
                Menunggu kelengkapan soal
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
              <div className="text-green-600 dark:text-green-400">
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
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
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
      <Card className="bg-white dark:bg-card hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{ujian.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className="bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300" variant="secondary">
                Selesai
              </Badge>
              {ujian.attempt_count > 1 && (
                <Badge variant="outline" className="text-xs">
                  {ujian.attempt_count} percobaan
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {ujian.averageScore !== null && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">{ujian.attempt_count > 1 ? 'Nilai Terbaik:' : 'Nilai:'}</span>
              <Badge variant="outline" className="font-bold">
                {ujian.averageScore}/100
              </Badge>
            </div>
          )}

          {/* Show per-attempt scores if multiple attempts */}
          {ujian.attempt_scores && ujian.attempt_scores.length > 1 && (
            <div className="space-y-1 text-xs border rounded-md p-2 bg-muted/30">
              <div className="font-medium text-muted-foreground mb-1">Riwayat Percobaan:</div>
              {ujian.attempt_scores.map((attempt: any) => (
                <div key={attempt.attempt} className="flex items-center justify-between">
                  <span>Percobaan {attempt.attempt}</span>
                  <Badge variant={attempt.score === ujian.averageScore ? 'default' : 'outline'} className="text-xs">
                    {attempt.score !== null ? `${attempt.score}/100` : 'Belum dinilai'}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Guru:</span>
              <span>{teacherName}</span>
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

          <div className="pt-2 space-y-2">
            <Button variant="outline" asChild className="w-full">
              <Link href={`/siswa/hasil/${ujian.id}`}>
                <FileText className="h-4 w-4 mr-2" />
                Lihat Detail
              </Link>
            </Button>
            
            {ujian.can_remidi && (
              <Button asChild className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                <Link href={`/siswa/ujian/${ujian.id}?remidi=true`}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Remidi (Percobaan {(ujian.attempt_count || 1) + 1}{ujian.max_attempts === 0 ? '' : `/${ujian.max_attempts}`})
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
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

interface SiswaKelasDetailClientProps {
  kelasId: string
}

export default function SiswaKelasDetailClient({ kelasId }: SiswaKelasDetailClientProps) {
  const [kelasDetail, setKelasDetail] = useState<KelasDetail | null>(null)
  const [availableUjian, setAvailableUjian] = useState<any[]>([])
  const [completedUjian, setCompletedUjian] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUjian, setIsLoadingUjian] = useState(true)
  const router = useRouter()



  const fetchKelasDetail = async () => {
    try {
      setIsLoading(true)
      
      // SSR cookies handle authentication for same-origin calls
      const response = await fetch(`/api/kelas/${kelasId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          toastError('Kelas Tidak Ditemukan', 'Kelas yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.')
          router.push('/siswa/dashboard')
          return
        }
        throw new Error('Failed to fetch kelas detail')
      }

      const result = await response.json()
      if (result.success) {
        setKelasDetail(result.data)
      }
    } catch (_error: unknown) {
      toastError('Error', 'Gagal memuat detail kelas')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUjianByKelas = async () => {
    try {
      setIsLoadingUjian(true)
      
      // SSR cookies handle authentication for same-origin calls
      // Fetch available ujian for this kelas
      const availableResponse = await fetch(`/api/ujian/available?kelasId=${kelasId}`, {
        credentials: 'include',
      })

      if (availableResponse.ok) {
        const availableResult = await availableResponse.json()
        if (availableResult.success) {
          setAvailableUjian(availableResult.data || [])
        }
      }

      // Fetch completed ujian for this kelas
      const completedResponse = await fetch(`/api/ujian/completed?kelasId=${kelasId}`, {
        credentials: 'include',
      })

      if (completedResponse.ok) {
        const completedResult = await completedResponse.json()
        if (completedResult.success) {
          setCompletedUjian(completedResult.data || [])
        }
      }

    } catch (_error: unknown) {
      // Error handled silently
    } finally {
      setIsLoadingUjian(false)
    }
  }

  useEffect(() => {
    if (kelasId) {
      fetchKelasDetail()
      fetchUjianByKelas()
    }
  }, [kelasId])  

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <UjianSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!kelasDetail) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Kelas Tidak Ditemukan</h3>
        <p className="text-muted-foreground mb-4">
          Kelas yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.
        </p>
        <Button asChild>
          <Link href="/siswa/dashboard">
            Kembali ke Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Kelas Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                <School className="h-6 w-6" />
                {kelasDetail.nama_kelas}
              </CardTitle>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Guru:</span>
            <span>{kelasDetail.guru_name}</span>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Ujian Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableUjian.filter(u => u.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Siap untuk dikerjakan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Ujian Dikerjakan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedUjian.length}</div>
            <p className="text-xs text-muted-foreground">Sudah diselesaikan</p>
          </CardContent>
        </Card>
      </div>

      {/* Ujian Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="bg-white dark:bg-card border shadow-sm p-1 rounded-lg">
          <TabsTrigger value="active" className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800">
            <BookOpen className="h-4 w-4 mr-2" />
            Ujian Aktif ({availableUjian.filter(u => u.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800">
            <CheckCircle className="h-4 w-4 mr-2" />
            Ujian Dikerjakan ({completedUjian.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          {isLoadingUjian ? (
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
                    Tunggu guru untuk membuat ujian di kelas ini
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
          {isLoadingUjian ? (
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
                .map((ujian: any) => (
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
  )
}