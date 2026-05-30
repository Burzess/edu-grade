import { BarChart3, FileText, Shield, Users } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdmin } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminReportsPage() {
  await requireAdmin()
  const adminSupabase = await createAdminClient()

  const last7Days = new Date()
  last7Days.setDate(last7Days.getDate() - 7)

  const [
    totalUsersResult,
    totalUjianResult,
    totalKelasResult,
    securityWeekResult,
    auditWeekResult,
  ] = await Promise.all([
    adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
    adminSupabase.from('ujian').select('id', { count: 'exact', head: true }),
    adminSupabase.from('kelas').select('id', { count: 'exact', head: true }),
    adminSupabase
      .from('security_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last7Days.toISOString()),
    adminSupabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', last7Days.toISOString()),
  ])

  const totalUsers = totalUsersResult.count ?? 0
  const totalUjian = totalUjianResult.count ?? 0
  const totalKelas = totalKelasResult.count ?? 0
  const securityWeek = securityWeekResult.count ?? 0
  const auditWeek = auditWeekResult.count ?? 0

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Laporan Sistem</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ringkasan performa dan keamanan platform Edu-Grade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Akun terdaftar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalKelas}</div>
              <p className="text-xs text-muted-foreground">Kelas aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Ujian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUjian}</div>
              <p className="text-xs text-muted-foreground">Ujian terdaftar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Event Keamanan (7H)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{securityWeek}</div>
              <p className="text-xs text-muted-foreground">Event dalam 7 hari</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Snapshot Mingguan
              </CardTitle>
              <CardDescription>Ringkasan aktivitas 7 hari terakhir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>Audit log tercatat: {auditWeek} aktivitas.</div>
              <div>Event keamanan tercatat: {securityWeek} event.</div>
              <div>Ujian aktif dan draft terus dipantau untuk stabilitas sistem.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Laporan Keamanan
              </CardTitle>
              <CardDescription>Rekap event keamanan untuk kepatuhan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Export laporan keamanan untuk kebutuhan audit dan koordinasi dengan pihak sekolah.
              </div>
              <Button variant="outline" disabled className="w-full">
                Unduh Laporan Keamanan
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Laporan Pengguna
              </CardTitle>
              <CardDescription>Rekap akun guru dan siswa.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">Unduh Laporan Pengguna</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Laporan Ujian
              </CardTitle>
              <CardDescription>Ringkasan performa ujian global.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">Unduh Laporan Ujian</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Laporan Audit
              </CardTitle>
              <CardDescription>Rekap aktivitas admin sistem.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled className="w-full">Unduh Laporan Audit</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
