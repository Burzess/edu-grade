'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Users,
  Play,
} from 'lucide-react'
import { formatDistanceToNow, format, isAfter, isBefore } from 'date-fns'
import { id } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

interface UjianCardProps {
  ujian: any
  type: 'active' | 'completed'
}

interface KelasDetail {
  id: string
  nama_kelas: string
  deskripsi?: string
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
          color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
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
              <Button asChild className="w-full">
                <Link href={`/siswa/ujian/${ujian.id || ujian.exam_id}`}>
                  <Play className="h-4 w-4 mr-2" />
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
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
            {ujian.status === 'draft' && (
              <div className="text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-center">
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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{ujian.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
            </div>
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" variant="secondary">
              Selesai
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {ujian.averageScore !== null && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <span className="font-medium">Nilai:</span>
              <Badge variant="outline" className="font-bold">
                {ujian.averageScore}/100
              </Badge>
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
  const { user } = useAuthStore()
  const supabase = createClient()

  // Temporary toast implementation
  const toast = ({ title, description, variant }: any) => {
    console.log('Toast:', { title, description, variant });
    alert(title + (description ? ': ' + description : ''));
  };

  const fetchKelasDetail = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/kelas/${kelasId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Kelas Tidak Ditemukan',
            description: 'Kelas yang Anda cari tidak ditemukan atau Anda tidak memiliki akses.',
            variant: 'destructive',
          })
          router.push('/siswa/dashboard')
          return
        }
        throw new Error('Failed to fetch kelas detail')
      }

      const result = await response.json()
      if (result.success) {
        setKelasDetail(result.data)
      }
    } catch (error) {
      console.error('Error fetching kelas detail:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat detail kelas',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUjianByKelas = async () => {
    try {
      setIsLoadingUjian(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return
      }

      // Fetch available ujian for this kelas
      const availableResponse = await fetch(`/api/ujian/available?kelasId=${kelasId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (availableResponse.ok) {
        const availableResult = await availableResponse.json()
        if (availableResult.success) {
          setAvailableUjian(availableResult.data || [])
        }
      }

      // Fetch completed ujian for this kelas
      const completedResponse = await fetch(`/api/ujian/completed?kelasId=${kelasId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (completedResponse.ok) {
        const completedResult = await completedResponse.json()
        if (completedResult.success) {
          setCompletedUjian(completedResult.data || [])
        }
      }

    } catch (error) {
      console.error('Error fetching ujian:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

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
              {kelasDetail.deskripsi && (
                <CardDescription className="text-base">
                  {kelasDetail.deskripsi}
                </CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Guru:</span>
              <span>{kelasDetail.guru_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm font-mono">
                Kode: {kelasDetail.kode_kelas}
              </Badge>
            </div>
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