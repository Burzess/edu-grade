"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useUjian, useDeleteUjian } from '@/hooks/use-ujian'
import { useKelasGuru } from '@/hooks/use-kelas'
import { AdminLayout } from '@/components/layout/admin-layout'
import { AuthGuard } from '@/components/auth/auth-guards'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Search, MoreVertical, Edit, Trash2, Clock, Users, FileText, Eye } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { id } from 'date-fns/locale'

interface UjianCardProps {
  ujian: any
  onDelete: (id: string) => void
}

function UjianCard({ ujian, onDelete }: UjianCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const getStatus = () => {
    const soalCount = ujian.ujian_soal?.length || 0
    if (ujian.status === 'draft') {
      if (soalCount > 0) {
        return { label: 'Draft (Siap)', color: 'bg-orange-100 text-orange-800' }
      }
      return { label: 'Menunggu Soal', color: 'bg-yellow-100 text-yellow-800' }
    }
    
    if (ujian.status === 'active') {
      const now = new Date()
      if (ujian.start_time && new Date(ujian.start_time) > now) {
        return { label: 'Ready', color: 'bg-blue-100 text-blue-800' }
      }
      if (ujian.end_time && new Date(ujian.end_time) < now) {
        return { label: 'Selesai', color: 'bg-gray-100 text-gray-800' }
      }
      return { label: 'Berlangsung', color: 'bg-green-100 text-green-800' }
    }

    if (ujian.status === 'completed') {
      return { label: 'Selesai', color: 'bg-gray-100 text-gray-800' }
    }
    
    return { label: 'Menunggu Soal', color: 'bg-yellow-100 text-yellow-800' }
  }

  const status = getStatus()
  const soalCount = ujian.ujian_soal?.length || 0

  // Format durasi ke jam dan menit
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`
    }
    return `${mins} menit`
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{ujian.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {ujian.ujian_kelas && ujian.ujian_kelas.length > 0 ? (
                  <Badge variant="outline" className="text-xs max-w-[200px]" title={ujian.ujian_kelas.map((uk: any) => uk.kelas?.nama_kelas).filter(Boolean).join(', ')}>
                    <span className="truncate">
                      Kelas: {ujian.ujian_kelas.map((uk: any) => uk.kelas?.nama_kelas).filter(Boolean).join(', ')}
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Kelas: Global
                  </Badge>
                )}
                {ujian.guru_id ? (
                  <Badge variant="secondary" className="text-xs max-w-[200px] bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <span className="truncate">
                      Guru: {ujian.guru?.full_name || 'Tidak Diketahui'}
                    </span>
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs text-muted-foreground">
                    Tanpa Guru Pengampu
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={status.color} variant="secondary">
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/ujian/${ujian.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Detail
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/ujian/${ujian.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Statistik */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{soalCount} soal</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{ujian.totalPeserta || 0} peserta</span>
            </div>
          </div>

          {/* Waktu dan Durasi */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Durasi:</span>
              <span>{formatDuration(ujian.duration_minutes || 60)}</span>
            </div>
            
            {ujian.start_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Dimulai:</span>
                <span>{format(new Date(ujian.start_time), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
              </div>
            )}
            
            {ujian.end_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Selesai:</span>
                <span>{format(new Date(ujian.end_time), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
              </div>
            )}

            {/* {ujian.status === 'draft' && (
              <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-2 rounded">
                💡 Ujian belum dimulai. Klik "Mulai Ujian" untuk mengaktifkan.
              </div>
            )} */}
          </div>

          {/* Ujian otomatis publish ketika soal ditambahkan, dan berjalan sesuai jadwal */}

          {/* Created info */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Dibuat {formatDistanceToNow(new Date(ujian.created_at), { 
              addSuffix: true, 
              locale: id 
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Ujian</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus ujian &quot;{ujian.name}&quot;? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(ujian.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function UjianPageContent() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterKelas, setFilterKelas] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const pageSize = 12

  const { data: ujianData, isLoading, error } = useUjian(currentPage, pageSize)
  const { data: kelasData } = useKelasGuru()
  const deleteUjianMutation = useDeleteUjian()

  const handleDelete = async (id: string) => {
    try {
      await deleteUjianMutation.mutateAsync(id)
      toast.success('Ujian berhasil dihapus')
    } catch (_error: unknown) {
      toast.error('Gagal menghapus ujian')
    }
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-red-600">Terjadi kesalahan: {error.message}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-4"
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    )
  }

  const filteredUjian = ujianData?.data?.filter(ujian => {
    // Search filter
    const matchesSearch = ujian.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ujian.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Kelas filter
    let matchesKelas = true
    if (filterKelas === 'global') {
      matchesKelas = !(ujian.ujian_kelas && ujian.ujian_kelas.length > 0)
    } else if (filterKelas !== 'all') {
      matchesKelas = ujian.ujian_kelas?.some((uk: any) => uk.kelas_id === filterKelas)
    }
    
    return matchesSearch && matchesKelas
  }) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kelola Ujian</h1>
          <p className="text-muted-foreground">
            Kelola ujian yang akan diberikan kepada siswa
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ujian/new">
            <Plus className="h-4 w-4 mr-2" />
            Buat Ujian
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ujian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Ujian</SelectItem>
              <SelectItem value="global">Ujian Global</SelectItem>
              {kelasData?.map((kelas) => (
                <SelectItem key={kelas.id} value={kelas.id}>
                  {kelas.nama_kelas}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(searchQuery || filterKelas !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setFilterKelas('all')
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <UjianSkeleton key={i} />
          ))}
        </div>
      ) : filteredUjian.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery ? (
            <>
              <p className="text-muted-foreground text-lg mb-4">
                Tidak ada ujian yang cocok dengan pencarian &quot;{searchQuery}&quot;
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
              >
                Hapus Filter
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-lg mb-4">
                Belum ada ujian yang dibuat
              </p>
              <Button asChild>
                <Link href="/admin/ujian/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Ujian Pertama
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Results info */}
          <div className="text-sm text-muted-foreground">
            Menampilkan {filteredUjian.length} dari {ujianData?.count || 0} ujian
            {(searchQuery || filterKelas !== 'all') && (
              <span className="ml-2 text-primary">
                (dengan filter aktif)
              </span>
            )}
          </div>

          {/* Ujian Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUjian.map((ujian) => (
              <UjianCard
                key={ujian.id}
                ujian={ujian}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {ujianData?.hasMore && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={isLoading}
              >
                Muat Lebih Banyak
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function UjianPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <AdminLayout>
        <UjianPageContent />
      </AdminLayout>
    </AuthGuard>
  )
}
