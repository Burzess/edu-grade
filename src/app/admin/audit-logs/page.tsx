'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { FileText } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientPagination } from '@/components/ui/client-pagination'
import { useAdminAuditLogs } from '@/hooks/use-admin'
import { AuthGuard } from '@/components/auth/auth-guards'

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'

const formatId = (value: string | null) =>
  value ? `${value.slice(0, 8)}...` : '-'

function AuditLogsContent() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const { data, isLoading } = useAdminAuditLogs({ page, limit: pageSize, search })

  const logs = data?.data ?? []
  const totalFiltered = data?.count ?? 0
  const totalLogs = data?.stats?.total ?? 0
  const logs24h = data?.stats?.last24h ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Riwayat aktivitas admin dan perubahan sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLogs}</div>
              <p className="text-xs text-muted-foreground">Semua aktivitas tercatat</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">24 Jam Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs24h}</div>
              <p className="text-xs text-muted-foreground">Aktivitas terbaru</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Detail Audit Log
            </CardTitle>
            <CardDescription>Gunakan filter untuk mencari aktivitas tertentu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">Pencarian</label>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Cari action atau entity"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={() => { setSearch(''); setPage(1) }} variant="outline" className="w-full">
                  Bersihkan Filter
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Memuat data...</div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada audit log.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log, index) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-center">{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          {log.entity_type}
                          {log.entity_id ? ` (${formatId(log.entity_id)})` : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.actor_role || 'system'}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ClientPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default function AdminAuditLogsPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <AuditLogsContent />
    </AuthGuard>
  )
}
