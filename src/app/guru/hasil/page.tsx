'use client'

import Link from 'next/link'
import { useUjianGuru } from '@/hooks/use-hasil-ujian'
import { GuruLayout } from '@/components/layout/guru-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen,
  Users,
  BarChart3,
  FileText,
  Eye,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface UjianCardProps {
  ujian: any
}

function UjianCard({ ujian }: UjianCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Selesai</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
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
          {getStatusBadge(ujian.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistik */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span>Soal</span>
            </div>
            <div className="font-bold text-lg">{ujian.totalSoal}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span>Siswa</span>
            </div>
            <div className="font-bold text-lg">{ujian.totalSiswa}</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span>Rata-rata</span>
            </div>
            <div className="font-bold text-lg">
              {ujian.averageScore !== null ? `${ujian.averageScore}` : '-'}
            </div>
          </div>
        </div>

        {/* Info Waktu */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Durasi: {ujian.duration_minutes || 60} menit</span>
          </div>
          
            <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>
              Dimulai: {ujian.start_time 
              ? format(new Date(ujian.start_time), 'dd MMM yyyy, HH:mm', { locale: id })
              : '-'
              }
            </span>
            </div>
        </div>

        {/* Tombol Aksi */}
        <div className="pt-2">
          <Button asChild className="w-full">
            <Link href={`/guru/hasil/${ujian.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              Lihat Hasil
            </Link>
          </Button>
        </div>

        {/* Info Dibuat */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Dibuat: {format(new Date(ujian.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
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
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
          <div className="text-center space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
          <div className="text-center space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export default function GuruHasilDashboard() {
  const { data: ujianList = [], isLoading } = useUjianGuru()

  // Hitung statistik keseluruhan
  const totalUjian = ujianList.length
  const activeUjian = ujianList.filter(u => u.status === 'active').length
  const totalSiswaUnik = new Set(ujianList.flatMap(u => Array(u.totalSiswa).fill(0).map((_, i) => `${u.id}_${i}`))).size
  const overallAverage = ujianList.length > 0 
    ? Math.round(ujianList.reduce((sum, u) => sum + (u.averageScore || 0), 0) / ujianList.filter(u => u.averageScore !== null).length) || null
    : null

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">
            Hasil Ujian Siswa
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Lihat dan kelola hasil ujian yang telah dikerjakan siswa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Ujian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUjian}</div>
              <p className="text-xs text-muted-foreground">Ujian yang dibuat</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ujian Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeUjian}</div>
              <p className="text-xs text-muted-foreground">Sedang berlangsung</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Partisipasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ujianList.reduce((sum, u) => sum + u.totalSiswa, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Total pengerjaan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallAverage !== null ? overallAverage : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Nilai keseluruhan</p>
            </CardContent>
          </Card>
        </div>

        {/* Ujian List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Daftar Ujian</h3>
            <Button asChild>
              <Link href="/guru/ujian">
                <BookOpen className="h-4 w-4 mr-2" />
                Kelola Ujian
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <UjianSkeleton key={i} />
              ))}
            </div>
          ) : ujianList.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                Belum ada ujian yang dibuat
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Buat ujian terlebih dahulu untuk melihat hasil siswa
              </p>
              <Button asChild>
                <Link href="/guru/ujian/new">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Buat Ujian Baru
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ujianList.map((ujian) => (
                <UjianCard key={ujian.id} ujian={ujian} />
              ))}
            </div>
          )}
        </div>
      </div>
    </GuruLayout>
  )
}
