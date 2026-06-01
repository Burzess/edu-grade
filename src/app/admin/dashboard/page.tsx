import Link from 'next/link'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Activity, BarChart3, Shield, Users } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type SecurityEventRow = Database['public']['Tables']['security_events']['Row']

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'

const formatId = (value: string | null) =>
  value ? `${value.slice(0, 8)}...` : '-'

const getSeverityBadge = (severity: string | null) => {
  const normalized = severity || 'info'
  if (normalized === 'critical' || normalized === 'high') {
    return <Badge variant="destructive">Kritis</Badge>
  }
  if (normalized === 'warning' || normalized === 'medium') {
    return <Badge variant="secondary">Peringatan</Badge>
  }
  return <Badge className="bg-cyan-100 text-cyan-800">Info</Badge>
}

export default async function AdminDashboardPage() {
  await requireAdmin()
  const adminSupabase = await createAdminClient()

  const last24Hours = new Date()
  last24Hours.setHours(last24Hours.getHours() - 24)

  const [
    totalUsersResult,
    guruUsersResult,
    siswaUsersResult,
    adminUsersResult,
    totalUjianResult,
    activeUjianResult,
    totalKelasResult,
    security24hResult,
  ] = await Promise.all([
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'guru'),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'siswa'),
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    adminSupabase.from('ujian').select('id', { count: 'exact', head: true }),
    adminSupabase.from('ujian').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    adminSupabase.from('kelas').select('id', { count: 'exact', head: true }),
    adminSupabase
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last24Hours.toISOString()),
  ])

  const { data: securityData } = await adminSupabase
    .from('security_events')
    .select('id, event_type, severity, user_id, ujian_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const securityEvents = (securityData ?? []) as SecurityEventRow[]

  const totalUsers = totalUsersResult.count ?? 0
  const totalGuru = guruUsersResult.count ?? 0
  const totalSiswa = siswaUsersResult.count ?? 0
  const totalAdmin = adminUsersResult.count ?? 0
  const totalUjian = totalUjianResult.count ?? 0
  const totalUjianAktif = activeUjianResult.count ?? 0
  const totalKelas = totalKelasResult.count ?? 0
  const pelanggaran24h = security24hResult.count ?? 0

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Dashboard Admin</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ringkasan aktivitas platform dan monitoring keamanan ujian.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Admin {totalAdmin} · Guru {totalGuru} · Siswa {totalSiswa}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKelas}</div>
              <p className="text-xs text-muted-foreground">Kelas aktif di sistem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Ujian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUjian}</div>
              <p className="text-xs text-muted-foreground">Ujian aktif {totalUjianAktif}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pelanggaran 24 Jam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pelanggaran24h}</div>
              <p className="text-xs text-muted-foreground">Event keamanan terbaru</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Aksi Cepat Admin
              </CardTitle>
              <CardDescription>Akses cepat ke modul utama.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button asChild>
                  <Link href="/admin/users">
                    <Users className="h-4 w-4" />
                    Kelola Akun
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/monitoring">
                    <Activity className="h-4 w-4" />
                    Monitoring Ujian
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/reports">
                    <BarChart3 className="h-4 w-4" />
                    Laporan Sistem
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Monitoring Keamanan
              </CardTitle>
              <CardDescription>Event keamanan terbaru dari sesi ujian.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground">Belum ada event keamanan.</div>
              ) : (
                <div className="space-y-3">
                  {securityEvents.map(event => (
                    <div key={event.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {event.event_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          User {formatId(event.user_id)} · {formatDate(event.created_at)}
                        </div>
                      </div>
                      {getSeverityBadge(event.severity)}
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" asChild className="w-full">
                <Link href="/admin/monitoring">Lihat Semua Monitoring</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
