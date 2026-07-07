'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Users, UserPlus, Upload } from 'lucide-react'
import AdminLayout from '@/components/layout/admin-layout'
import { AdminToastHandler } from '@/components/admin/admin-toast-handler'
import { UserActionButtons } from '@/components/admin/user-action-buttons'
import { CreateAccountModal } from '@/components/admin/create-account-modal'
import { ImportModal } from '@/components/admin/import-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientPagination } from '@/components/ui/client-pagination'
import { useAdminUsers } from '@/hooks/use-admin'
import { AuthGuard } from '@/components/auth/auth-guards'
import { useAuthStore } from '@/store/auth'

type Role = 'admin' | 'guru' | 'siswa'

const formatDate = (value: string | null) =>
  value ? format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: idLocale }) : '-'

const isRole = (value: string): value is Role =>
  value === 'admin' || value === 'guru' || value === 'siswa'

const roleStyles: Record<Role, { label: string; className: string }> = {
  admin: { label: 'Admin', className: 'bg-primary/10 text-primary border-primary/30' },
  guru: { label: 'Guru', className: 'bg-secondary/20 text-secondary-foreground border-secondary/40' },
  siswa: { label: 'Siswa', className: 'bg-muted text-muted-foreground border-border' },
}

function UsersContent() {
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const pageSize = 10

  const { data, isLoading, refetch } = useAdminUsers({ page, limit: pageSize, search, role: roleFilter })

  const profiles = data?.data ?? []
  const authUsers = data?.authUsers ?? {}
  const totalPages = data?.totalPages ?? 1
  const stats = data?.stats ?? { total: 0, guru: 0, siswa: 0, admin: 0 }

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setPage(1)
  }

  const handleAccountCreated = () => {
    void refetch()
  }

  const handleImportSuccess = () => {
    void refetch()
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Kelola Akun</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Pantau dan atur akun guru, siswa, dan admin.
            </p>
          </div>
        </div>

        <AdminToastHandler />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Akun</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Semua pengguna terdaftar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admin}</div>
              <p className="text-xs text-muted-foreground">Akun pengelola sistem</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Guru</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.guru}</div>
              <p className="text-xs text-muted-foreground">Akun pengajar aktif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.siswa}</div>
              <p className="text-xs text-muted-foreground">Akun peserta ujian</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Daftar Pengguna
              </CardTitle>
              <CardDescription className="mt-1">Gunakan filter untuk mencari akun tertentu.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCreateModalOpen(true)}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Buat Akun
              </Button>
              <Button
                onClick={() => setImportModalOpen(true)}
                disabled={isLoading}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Akun
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Pencarian</label>
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Cari nama atau email"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs"
                >
                  <option value="all">Semua Role</option>
                  <option value="admin">Admin</option>
                  <option value="guru">Guru</option>
                  <option value="siswa">Siswa</option>
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
            ) : profiles.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada data pengguna.</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] text-center">No</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Terakhir Login</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.map((profile, index) => {
                      const role = isRole(profile.role) ? profile.role : 'siswa'
                      const roleInfo = roleStyles[role]
                      const authUser = authUsers[profile.id]
                      const bannedUntil = authUser?.banned_until || null
                      const isSuspended = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="text-center">{(page - 1) * pageSize + index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {profile.full_name || 'Tanpa Nama'}
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            <Badge className={roleInfo.className}>{roleInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isSuspended ? 'destructive' : 'outline'}>
                              {isSuspended ? 'Disuspend' : 'Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(authUser?.last_sign_in_at ?? null)}</TableCell>
                          <TableCell>
                            <UserActionButtons
                              userId={profile.id}
                              isSuspended={isSuspended}
                              currentAdminId={currentUser?.id ?? ''}
                              userName={profile.full_name || profile.email}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <ClientPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>

        <CreateAccountModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={handleAccountCreated}
        />

        <ImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onSuccess={handleImportSuccess}
        />
      </div>
    </AdminLayout>
  )
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <UsersContent />
    </AuthGuard>
  )
}
