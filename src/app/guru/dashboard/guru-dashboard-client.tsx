'use client'

import Link from 'next/link'
import { useDashboardStats, useRecentActivity, type ActivityItem } from '@/hooks/use-dashboard-guru'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Users,
  BarChart3,
  FileText,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

function ActivityItemCard({ activity }: { activity: ActivityItem }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ujian_aktif':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30' }
      case 'ujian_dibuat':
        return { icon: BookOpen, color: 'text-brand-500 dark:text-brand-400', bgColor: 'bg-brand-50 dark:bg-brand-950/30' }
      case 'siswa_mulai_ujian':
        return { icon: Activity, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30' }
      case 'siswa_selesai_ujian':
        return { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/30' }
      case 'siswa_mengerjakan':
        return { icon: Clock, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30' }
      case 'jawaban_masuk':
        return { icon: FileText, color: 'text-brand-500 dark:text-brand-400', bgColor: 'bg-brand-50 dark:bg-brand-950/30' }
      default:
        return { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30' }
    }
  }

  const { icon: Icon, color, bgColor } = getActivityIcon(activity.type)
  
  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className={`p-2 rounded-full ${bgColor}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {activity.title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {activity.description}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {format(activity.time, 'dd MMM, HH:mm', { locale: id })}
        </p>
      </div>
      {activity.ujianId && (
        <Link href={`/guru/ujian/${activity.ujianId}/statistik`}>
          <Button size="sm" variant="ghost" className="text-xs">
            Lihat
          </Button>
        </Link>
      )}
    </div>
  )
}

export default function GuruDashboardClient() {
  // Database hooks untuk mengambil data real dari database
  const { 
    data: stats, 
    isLoading: isStatsLoading, 
    error: statsError 
  } = useDashboardStats()
  
  const { 
    data: recentActivity = [], 
    isLoading: isActivityLoading, 
    error: activityError 
  } = useRecentActivity()

  return (
    <>
      {/* Error Display */}
      {statsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-medium">Error loading dashboard data</h3>
          </div>
          <p className="text-red-600 text-sm mt-1">
            {statsError.message || 'Failed to load dashboard statistics'}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Ujian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-500">
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : statsError ? (
                <span className="text-red-500">Error</span>
              ) : (
                stats?.totalUjian ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Ujian yang dibuat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ujian Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : statsError ? (
                <span className="text-red-500">Error</span>
              ) : (
                stats?.activeUjian ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Sedang berlangsung</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : statsError ? (
                <span className="text-red-500">Error</span>
              ) : (
                stats?.totalSiswa ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Siswa terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Siswa Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : statsError ? (
                <span className="text-red-500">Error</span>
              ) : (
                stats?.siswaAktif ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Sedang mengerjakan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Nilai</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gold-400">
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : statsError ? (
                <span className="text-red-500">Error</span>
              ) : (
                stats?.averageScore ? `${stats.averageScore}%` : '-'
              )}
            </div>
            <p className="text-xs text-muted-foreground">Nilai keseluruhan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
        {/* Quick Actions */}
        <div className="lg:col-span-3">
          <div>
            <h2 className="text-lg font-semibold mb-4">Aksi Cepat</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button asChild className="h-20 flex-col gap-2">
                <Link href="/guru/ujian/new">
                  <PlusCircle className="h-6 w-6" />
                  <span>Buat Ujian Baru</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-20 flex-col gap-2">
                <Link href="/guru/soal">
                  <FileText className="h-6 w-6" />
                  <span>Kelola Bank Soal</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-20 flex-col gap-2">
                <Link href="/guru/hasil">
                  <BarChart3 className="h-6 w-6" />
                  <span>Lihat Hasil</span>
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="h-20 flex-col gap-2">
                <Link href="/guru/kelas">
                  <Users className="h-6 w-6" />
                  <span>Kelola Kelas</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Aktivitas Terbaru
            </CardTitle>
            <CardDescription>
              Pantau aktivitas ujian dan penilaian terbaru
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isActivityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 animate-pulse rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Belum ada aktivitas terbaru</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <ActivityItemCard key={activity.id} activity={activity} />
              ))
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" className="w-full">
                Lihat Semua Aktivitas
              </Button>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </>
  )
}
