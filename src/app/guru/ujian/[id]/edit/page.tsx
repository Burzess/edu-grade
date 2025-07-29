'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUjianDetail, useUpdateUjian } from '@/hooks/use-ujian'
import { useSoalList } from '@/hooks/use-soal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, FileText, Clock, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Link from 'next/link'

const ujianSchema = z.object({
  name: z.string().min(3, 'Nama ujian minimal 3 karakter'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Durasi minimal 1 menit').max(480, 'Durasi maksimal 8 jam'),
  selected_soal: z.array(z.string()).min(1, 'Pilih minimal 1 soal'),
})

type UjianForm = z.infer<typeof ujianSchema>

interface EditUjianPageProps {
  params: Promise<{
    id: string
  }>
}

interface SoalItemProps {
  soal: any
  isSelected: boolean
  onToggle: (soalId: string) => void
}

function SoalItem({ soal, isSelected, onToggle }: SoalItemProps) {
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
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(soal.id)}
            className="mt-1"
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium line-clamp-3">
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

export default function EditUjianPage({ params }: EditUjianPageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { data: ujian, isLoading: isLoadingUjian, error: fetchError } = useUjianDetail(resolvedParams.id)
  const updateUjianMutation = useUpdateUjian()
  const { data: soalData, isLoading: isLoadingSoal } = useSoalList({
    limit: 100
  })

  const form = useForm<UjianForm>({
    resolver: zodResolver(ujianSchema),
    defaultValues: {
      name: '',
      description: '',
      duration_minutes: 60,
      selected_soal: [],
    },
  })

  const selectedSoalIds = form.watch('selected_soal')
  const selectedCount = selectedSoalIds.length
  const totalSoal = soalData?.data?.length || 0
  
  // Simplified - just show all soal without search filtering
  const filteredSoal = soalData?.data || []

  // Update form values when ujian data is loaded
  useEffect(() => {
    if (ujian) {
      console.log('🔄 EditUjianPage: Setting form data:', ujian)

      form.reset({
        name: ujian.name,
        description: ujian.description || '',
        duration_minutes: ujian.duration_minutes || 60,
        selected_soal: ujian.ujian_soal?.map((us: any) => us.soal_id) || [],
      })
    }
  }, [ujian, form])

  const handleSoalToggle = (soalId: string) => {
    const current = form.getValues('selected_soal')
    if (current.includes(soalId)) {
      form.setValue('selected_soal', current.filter(id => id !== soalId))
    } else {
      form.setValue('selected_soal', [...current, soalId])
    }
  }

  const handleSelectAll = () => {
    if (!soalData?.data) return

    const allIds = soalData.data.map(soal => soal.id)
    const isAllSelected = allIds.every(id => selectedSoalIds.includes(id))

    if (isAllSelected) {
      form.setValue('selected_soal', [])
    } else {
      form.setValue('selected_soal', allIds)
    }
  }

  const onSubmit = async (data: UjianForm) => {
    try {
      setError(null)
      console.log('🔄 Updating ujian...', { id: resolvedParams.id, data })

      await updateUjianMutation.mutateAsync({
        id: resolvedParams.id,
        name: data.name,
        description: data.description,
        duration_minutes: data.duration_minutes,
        selected_soal: data.selected_soal,
      })

      router.push('/guru/ujian')
    } catch (err: any) {
      console.error('❌ Error updating ujian:', err)
      setError(err.message || 'Terjadi kesalahan saat mengupdate ujian')
    }
  }

  if (isLoadingUjian) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Kembali ke Daftar Ujian
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Ujian
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
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
        </main>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Kembali ke Daftar Ujian
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Ujian
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertDescription>
              Gagal memuat data ujian. Silakan coba lagi atau kembali ke daftar ujian.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/guru/ujian" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Daftar Ujian
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Ujian: {ujian?.name}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Detail Ujian</CardTitle>
                <CardDescription>
                  Edit informasi ujian dan pilih soal yang akan digunakan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert className="mb-6" variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Ujian *</FormLabel>
                          <FormControl>
                            <Input placeholder="Contoh: Ujian Tengah Semester" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deskripsi</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Deskripsi ujian (opsional)"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Durasi Ujian *</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input 
                                type="number" 
                                placeholder="60"
                                min="1"
                                max="480"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                              <div className="text-xs text-muted-foreground">
                                Durasi dalam menit (minimal 1 menit, maksimal 8 jam/480 menit)
                              </div>
                              {field.value > 0 && (
                                <div className="text-sm text-blue-600">
                                  = {Math.floor(field.value / 60)} jam {field.value % 60} menit
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="selected_soal"
                      render={() => (
                        <FormItem>
                          <FormLabel>Soal Dipilih</FormLabel>
                          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {selectedCount} dari {totalSoal} soal dipilih
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-4 border-t">
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => router.push('/guru/ujian')}
                          className="flex-1"
                        >
                          Batal
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateUjianMutation.isPending}
                          className="flex-1"
                        >
                          {updateUjianMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Simpan Perubahan
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Soal Selection Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Pilih Soal</CardTitle>
                <CardDescription>
                  Edit soal yang akan digunakan dalam ujian ini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Controls */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {totalSoal} soal tersedia
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={!soalData?.data || soalData.data.length === 0}
                  >
                    {soalData?.data?.every(soal => selectedSoalIds.includes(soal.id))
                      ? 'Batalkan Semua'
                      : 'Pilih Semua'
                    }
                  </Button>
                </div>

                {/* Soal List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {isLoadingSoal ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg">
                        <div className="flex items-start gap-3">
                          <Skeleton className="h-4 w-4 mt-1" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <div className="flex gap-1">
                              <Skeleton className="h-5 w-12" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredSoal.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Belum ada soal tersedia
                      </p>
                      <Button asChild className="mt-3">
                        <Link href="/guru/soal/new">
                          Buat Soal Pertama
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    filteredSoal.map((soal) => (
                      <SoalItem
                        key={soal.id}
                        soal={soal}
                        isSelected={selectedSoalIds.includes(soal.id)}
                        onToggle={handleSoalToggle}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
