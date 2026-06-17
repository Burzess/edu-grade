'use client'

import { useState, useDeferredValue, useMemo } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Activity, Shield } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientPagination } from '@/components/ui/client-pagination'
import { useAdminMonitoring } from '@/hooks/use-admin'
import { AuthGuard } from '@/components/auth/auth-guards'

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'

const eventLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    tab_switch: 'Pergantian Tab',
    screenshot_attempt: 'Upaya Screenshot',
    split_screen: 'Layar Terbagi',
    key_combination: 'Kombinasi Tombol',
    right_click: 'Klik Kanan',
    before_unload: 'Meninggalkan Halaman',
    orientation_suspicious: 'Orientasi Mencurigakan',
    viewport_change: 'Perubahan Viewport',
    text_selection: 'Seleksi Teks',
  }
  return labels[eventType] ?? eventType
}

const severityBadge = (severity: string | null) => {
  const normalized = severity || 'info'
  if (normalized === 'critical' || normalized === 'high') {
    return <Badge variant="destructive">Kritis</Badge>
  }
  if (normalized === 'warning' || normalized === 'medium') {
    return <Badge variant="secondary">Peringatan</Badge>
  }
  return <Badge className="bg-cyan-100 text-cyan-800">Info</Badge>
}

function MonitoringContent() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const pageSize = 15

  // Only send search to API when 3+ characters or empty (reset)
  const deferredSearch = useDeferredValue(search)
  const activeSearch = useMemo(
    () => (deferredSearch.length >= 3 ? deferredSearch : ''),
    [deferredSearch]
  )

  const { data, isLoading } = useAdminMonitoring({
    page,
    limit: pageSize,
    search: activeSearch,
    type: typeFilter,
    severity: severityFilter,
  })

  const events = data?.data ?? []
  const totalFiltered = data?.count ?? 0
  const totalPages = data?.totalPages ?? 1

  const tabSwitchCount = events.filter(e => e.event_type === 'tab_switch').length
  const screenshotCount = events.filter(e => e.event_type === 'screenshot_attempt').length
  const splitScreenCount = events.filter(e => e.event_type === 'split_screen').length

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setSeverityFilter('all')
    setPage(1)
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Monitoring Keamanan Ujian</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Pantau aktivitas mencurigakan dari sesi ujian secara real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFiltered}</div>
              <p className="text-xs text-muted-foreground">Event dalam daftar saat ini</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tab Switch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tabSwitchCount}</div>
              <p className="text-xs text-muted-foreground">Pergantian tab terdeteksi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Screenshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{screenshotCount}</div>
              <p className="text-xs text-muted-foreground">Upaya screenshot</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Split Screen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{splitScreenCount}</div>
              <p className="text-xs text-muted-foreground">Deteksi layar terbagi</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Daftar Event Keamanan
            </CardTitle>
            <CardDescription>Filter event berdasarkan tipe dan tingkat keparahan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pencarian</label>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Cari event atau user (min. 3 karakter)"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipe Event</label>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="tab_switch">Tab Switch</option>
                  <option value="screenshot_attempt">Screenshot</option>
                  <option value="split_screen">Split Screen</option>
                  <option value="key_combination">Kombinasi Tombol</option>
                  <option value="right_click">Klik Kanan</option>
                  <option value="before_unload">Before Unload</option>
                  <option value="orientation_suspicious">Orientasi</option>
                  <option value="viewport_change">Perubahan Viewport</option>
                  <option value="text_selection">Seleksi Teks</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => { setSeverityFilter(e.target.value); setPage(1) }}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="all">Semua Severity</option>
                  <option value="critical">Kritis</option>
                  <option value="high">Tinggi</option>
                  <option value="warning">Peringatan</option>
                  <option value="medium">Sedang</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Bersihkan Filter
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Memuat data...</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada event keamanan.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Ujian</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event, index) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-center">{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="font-medium">{eventLabel(event.event_type)}</TableCell>
                        <TableCell>{severityBadge(event.severity)}</TableCell>
                        <TableCell>{event.profiles?.full_name ?? '-'}</TableCell>
                        <TableCell>{event.ujian?.name ?? '-'}</TableCell>
                        <TableCell>{formatDate(event.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ClientPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Rekomendasi Monitoring
            </CardTitle>
            <CardDescription>Checklist singkat untuk menjaga integritas ujian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Pastikan setiap pelanggaran direview dan dicatat di audit log.</div>
            <div>Gunakan laporan untuk memonitor tren pelanggaran per kelas.</div>
            <div>Hubungi guru jika event berulang muncul pada ujian yang sama.</div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default function AdminMonitoringPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <MonitoringContent />
    </AuthGuard>
  )
}
