'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSoalList, useDeleteSoal, useSoalTags } from '@/hooks/use-soal'
import { GuruLayout } from '@/components/layout/guru-layout'
import { AuthGuard } from '@/components/auth/auth-guards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Plus, Search, Edit, Trash2, Filter } from 'lucide-react'
import Link from 'next/link'
import { CreateSoalModal } from '@/components/soal/create-soal-modal'

function SoalListPageContent() {
    const router = useRouter()

    // Filters state
    const [search, setSearch] = useState('')
    const [difficulty, setDifficulty] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // Queries
    const { data: soalData, isLoading, error } = useSoalList({
        page,
        limit: 10,
        search,
        tags: selectedTags,
        difficulty: difficulty === 'all' ? undefined : difficulty
    })

    const { data: availableTags } = useSoalTags()
    const deletesoalMutation = useDeleteSoal()

    const handleDelete = async (id: string) => {
        try {
            await deletesoalMutation.mutateAsync(id)
        } catch (error) {
            console.error('Error deleting soal:', error)
        }
    }

    const handleTagFilter = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(prev => prev.filter(t => t !== tag))
        } else {
            setSelectedTags(prev => [...prev, tag])
        }
        setPage(1)
    }

    const clearFilters = () => {
        setSearch('')
        setDifficulty('all')
        setSelectedTags([])
        setPage(1)
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-red-600">Terjadi Kesalahan</h2>
                    <p className="text-gray-600 mt-2">{error.message}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header & Create Button */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Bank Soal</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                        Kelola bank soal untuk ujian
                    </p>
                </div>
                <CreateSoalModal>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Buat Soal Baru
                    </Button>
                </CreateSoalModal>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filter & Pencarian
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari soal..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setPage(1)
                                }}
                                className="pl-10"
                            />
                        </div>

                        <Select value={difficulty} onValueChange={(value) => {
                            setDifficulty(value)
                            setPage(1)
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Tingkat Kesulitan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Tingkat</SelectItem>
                                <SelectItem value="easy">Mudah</SelectItem>
                                <SelectItem value="medium">Sedang</SelectItem>
                                <SelectItem value="hard">Sulit</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={clearFilters}>
                            Bersihkan Filter
                        </Button>
                    </div>

                    {/* Tag Filters */}
                    {availableTags && availableTags.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Filter berdasarkan tag:</p>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => handleTagFilter(tag)}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Soal Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {soalData ? `${soalData.count} Soal` : 'Memuat...'}
                    </CardTitle>
                    <CardDescription>
                        Daftar semua soal yang telah Anda buat
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <p>Memuat soal...</p>
                        </div>
                    ) : soalData?.data.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Belum ada soal yang dibuat</p>
                            <CreateSoalModal>
                                <Button className="mt-4">
                                    Buat Soal Pertama
                                </Button>
                            </CreateSoalModal>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table className="min-w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[45%] min-w-[300px]">Soal</TableHead>
                                            <TableHead className="w-[15%] min-w-[100px]">Tingkat</TableHead>
                                            <TableHead className="w-[20%] min-w-[120px]">Tags</TableHead>
                                            <TableHead className="w-[10%] min-w-[90px]">Tanggal Dibuat</TableHead>
                                            <TableHead className="w-[10%] min-w-[80px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                <TableBody>
                                    {soalData?.data.map((soal) => (
                                        <TableRow key={soal.id}>
                                            <TableCell className="max-w-0 px-4">
                                                <div className="font-medium truncate pr-2 max-w-[350px]" title={soal.question_text}>
                                                    {soal.question_text}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {soal.question_type === 'essay' ? 'Essay' : 'Pilihan Ganda'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    soal.difficulty_level === 'easy' ? 'secondary' :
                                                        soal.difficulty_level === 'medium' ? 'default' : 'destructive'
                                                }>
                                                    {soal.difficulty_level === 'easy' ? 'Mudah' :
                                                        soal.difficulty_level === 'medium' ? 'Sedang' : 'Sulit'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-0 px-2">
                                                <div className="flex flex-wrap gap-1 overflow-hidden max-w-[150px]">
                                                    {soal.tags?.slice(0, 2).map((tag: string) => (
                                                        <Badge key={tag} variant="outline" className="text-xs whitespace-nowrap truncate max-w-[60px]" title={tag}>
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {soal.tags && soal.tags.length > 2 && (
                                                        <Badge variant="outline" className="text-xs flex-shrink-0" title={soal.tags.slice(2).join(', ')}>
                                                            +{soal.tags.length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap px-2 text-center">
                                                <div className="text-xs">
                                                    {new Date(soal.created_at).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: '2-digit'
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-2">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0">
                                                        <Link href={`/guru/soal/${soal.id}/edit`} title="Edit soal">
                                                            <Edit className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Hapus soal">
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Apakah Anda yakin ingin menghapus soal ini?
                                                                    Tindakan ini tidak dapat dibatalkan.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(soal.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Hapus
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>

                            {/* Pagination */}
                            {soalData && soalData.totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4">
                                    <p className="text-sm text-gray-700">
                                        Halaman {soalData.page} dari {soalData.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                        >
                                            Sebelumnya
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={page === soalData.totalPages}
                                        >
                                            Selanjutnya
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function SoalListPage() {
    return (
        <AuthGuard requiredRole="guru" showLoading={false}>
            <GuruLayout>
                <SoalListPageContent />
            </GuruLayout>
        </AuthGuard>
    )
}
