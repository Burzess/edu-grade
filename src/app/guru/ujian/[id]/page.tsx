'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useUjianDetail, useDeleteUjian } from '@/hooks/use-ujian'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
    ArrowLeft,
    Edit,
    Trash2,
    Clock,
    FileText,
    Users,
    Calendar,
    Eye,
    AlertTriangle,
    CheckCircle2,
    Settings
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Link from 'next/link'
import { useState } from 'react'
import { GuruLayout } from '@/components/layout/guru-layout'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { GradeVisibilityToggle } from '@/components/ujian/grade-visibility-toggle'
import { useVisibilitySetting } from '@/features/ujian/hooks/use-visibility-setting'

interface UjianDetailPageProps {
    params: Promise<{
        id: string
    }>
}

interface SoalItemProps {
    soal: any
    urutan: number
}

function SoalItem({ soal, urutan }: SoalItemProps) {
    const getDifficultyColor = (level: string) => {
        switch (level) {
            case 'easy': return 'bg-green-100 text-green-800'
            case 'medium': return 'bg-yellow-100 text-yellow-800'
            case 'hard': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getDifficultyLabel = (level: string) => {
        switch (level) {
            case 'easy': return 'Mudah'
            case 'medium': return 'Sedang'
            case 'hard': return 'Sulit'
            default: return level
        }
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-brand-100 text-brand-800 rounded-full flex items-center justify-center text-sm font-medium">
                        {urutan}
                    </div>
                    <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-medium line-clamp-3">
                                {soal.question_text}
                            </p>
                            <div className="flex items-center gap-1">
                                <Badge
                                    variant="secondary"
                                    className={getDifficultyColor(soal.difficulty_level)}
                                >
                                    {getDifficultyLabel(soal.difficulty_level)}
                                </Badge>
                                <Badge variant="outline">
                                    {soal.question_type === 'essay' ? 'Essay' : 'Pilihan Ganda'}
                                </Badge>
                            </div>
                        </div>

                        {soal.tags && soal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {soal.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                            Dibuat {format(new Date(soal.created_at), 'dd MMM yyyy', { locale: id })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function UjianDetailPage({ params }: UjianDetailPageProps) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState(false)

    const { data: ujian, isLoading, error } = useUjianDetail(resolvedParams.id)
    const deleteUjianMutation = useDeleteUjian()
    const { setting: visibilitySetting, isLoading: isVisibilityLoading } = useVisibilitySetting(resolvedParams.id)

    const handleDelete = async () => {
        try {
            setIsDeleting(true)

            await deleteUjianMutation.mutateAsync(resolvedParams.id)

            router.push('/guru/ujian')
        } catch (_err: unknown) {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return (
            <GuruLayout>
                <div className="p-6 space-y-6">
                    <div className="flex items-center space-x-4">
                        <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Kembali ke Daftar Ujian
                        </Link>
                        <Skeleton className="h-6 w-48" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-6 w-full" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-32 w-full" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </GuruLayout>
        )
    }

    if (error || !ujian) {
        return (
            <GuruLayout>
                <div className="p-6 space-y-6">
                    <div className="flex items-center space-x-4">
                        <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Kembali ke Daftar Ujian
                        </Link>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Detail Ujian
                        </h1>
                    </div>

                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Ujian tidak ditemukan atau terjadi kesalahan saat memuat data.
                        </AlertDescription>
                    </Alert>
                </div>
            </GuruLayout>
        )
    }

    const getUjianStatus = () => {
        if (ujian.status === 'draft') {
            return { label: 'Draft', variant: 'secondary' as const, icon: Clock }
        } else if (ujian.status === 'active') {
            return { label: 'Sedang Berlangsung', variant: 'default' as const, icon: CheckCircle2 }
        } else {
            return { label: 'Selesai', variant: 'outline' as const, icon: CheckCircle2 }
        }
    }

    const status = getUjianStatus()
    const StatusIcon = status.icon

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
        <GuruLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                        <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Kembali ke Daftar Ujian
                        </Link>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {ujian.name}
                        </h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                        >
                            <Link href={`/guru/ujian/${ujian.id}/edit`}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                            </Link>
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Hapus
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Ujian</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Apakah Anda yakin ingin menghapus ujian &quot;{ujian.name}&quot;?
                                        Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait ujian.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {isDeleting ? 'Menghapus...' : 'Hapus'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Ujian Info Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="h-5 w-5" />
                                    Informasi Ujian
                                </CardTitle>
                                <CardDescription>
                                    Detail lengkap tentang ujian ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                                            <StatusIcon className="h-3 w-3" />
                                            {status.label}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Deskripsi</label>
                                    <p className="mt-1 text-sm">
                                        {ujian.description || 'Tidak ada deskripsi'}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Durasi Ujian</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {formatDuration(ujian.duration_minutes || 60)}
                                        </span>
                                    </div>
                                </div>

                                {ujian.start_time && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Waktu Mulai</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                {format(new Date(ujian.start_time), 'dd MMM yyyy, HH:mm', { locale: id })}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {ujian.end_time && (
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Waktu Selesai</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">
                                                {format(new Date(ujian.end_time), 'dd MMM yyyy, HH:mm', { locale: id })}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Jumlah Soal</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {ujian.ujian_soal?.length || 0} soal
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Dibuat</label>
                                    <p className="mt-1 text-sm">
                                        {format(new Date(ujian.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Statistik
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Peserta</span>
                                    <span className="text-sm font-medium">0 siswa</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Selesai</span>
                                    <span className="text-sm font-medium">0 siswa</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Rata-rata</span>
                                    <span className="text-sm font-medium">-</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pengaturan Visibilitas Nilai */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Pengaturan Nilai
                                </CardTitle>
                                <CardDescription>
                                    Kontrol visibilitas nilai untuk siswa
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isVisibilityLoading ? (
                                    <Skeleton className="h-6 w-full" />
                                ) : (
                                    <GradeVisibilityToggle
                                        ujianId={resolvedParams.id}
                                        currentSetting={visibilitySetting ?? 'visible'}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Soal List Section */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Daftar Soal ({ujian.ujian_soal?.length || 0})
                                </CardTitle>
                                <CardDescription>
                                    Soal-soal yang digunakan dalam ujian ini
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!ujian.ujian_soal || ujian.ujian_soal.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground">Belum ada soal yang dipilih</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3"
                                            asChild
                                        >
                                            <Link href={`/guru/ujian/${ujian.id}/edit`}>
                                                Tambah Soal
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {ujian.ujian_soal
                                            .sort((a: any, b: any) => a.urutan - b.urutan)
                                            .map((ujianSoal: any) => (
                                                <SoalItem
                                                    key={ujianSoal.id}
                                                    soal={ujianSoal.soal}
                                                    urutan={ujianSoal.urutan}
                                                />
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </GuruLayout>
    )
}
