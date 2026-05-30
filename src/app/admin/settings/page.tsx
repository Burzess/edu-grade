'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Settings } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientPagination } from '@/components/ui/client-pagination'
import { useAdminSettings, adminKeys } from '@/hooks/use-admin'
import { AuthGuard } from '@/components/auth/auth-guards'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'

const formatValue = (value: Record<string, unknown>) => {
  const raw = JSON.stringify(value)
  if (raw.length <= 80) return raw
  return `${raw.slice(0, 77)}...`
}

function SettingsContent() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [settingKey, setSettingKey] = useState('')
  const [settingValue, setSettingValue] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { data, isLoading } = useAdminSettings({ page })

  const settings = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const res = await fetch('/api/admin/settings/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: settingKey,
          value: settingValue,
          description: description || undefined,
        }),
      })

      const result = await res.json()
      if (!res.ok || !result.success) {
        toast.error(result.error || 'Gagal menyimpan pengaturan')
        return
      }

      toast.success('Pengaturan berhasil disimpan')
      setSettingKey('')
      setSettingValue('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: adminKeys.settings.all })
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Pengaturan Sistem</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Kelola konfigurasi utama dan flag sistem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Status Konfigurasi
              </CardTitle>
              <CardDescription>Ringkasan pengaturan utama sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Gunakan pengaturan untuk mengontrol fitur keamanan ujian.</div>
              <div>Perubahan pengaturan akan terekam di audit log.</div>
              <div>Pastikan semua perubahan telah dikonfirmasi sebelum disimpan.</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Manajemen Pengaturan</CardTitle>
              <CardDescription>Tambahkan atau ubah konfigurasi sistem.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="setting_key">
                    Kunci Pengaturan
                  </label>
                  <Input
                    id="setting_key"
                    value={settingKey}
                    onChange={(e) => setSettingKey(e.target.value)}
                    placeholder="contoh: exam_security"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="value">
                    Nilai (JSON Object)
                  </label>
                  <Textarea
                    id="value"
                    value={settingValue}
                    onChange={(e) => setSettingValue(e.target.value)}
                    placeholder='{"enabled": true, "max_attempts": 2}'
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="description">
                    Deskripsi
                  </label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Deskripsi singkat pengaturan"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengaturan</CardTitle>
            <CardDescription>Nilai konfigurasi yang tersimpan saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Memuat data...</div>
            ) : settings.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada pengaturan tersimpan.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead>Kunci</TableHead>
                      <TableHead>Nilai</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Terakhir Diperbarui</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.map((setting, index) => (
                      <TableRow key={setting.setting_key}>
                        <TableCell className="text-center">{(page - 1) * 10 + index + 1}</TableCell>
                        <TableCell className="font-medium">{setting.setting_key}</TableCell>
                        <TableCell>{formatValue(setting.value)}</TableCell>
                        <TableCell>{setting.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{formatDate(setting.updated_at)}</Badge>
                          </div>
                        </TableCell>
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

export default function AdminSettingsPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <SettingsContent />
    </AuthGuard>
  )
}
