'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUjian } from '@/hooks/use-ujian'
import { useSoalList } from '@/hooks/use-soal'
import { GuruOnlyGuard } from '@/components/auth/role-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, FileText, Clock, Filter, X, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Link from 'next/link'
import { GuruLayout } from '@/components/layout/guru-layout'
import KelasSelector from '@/components/ui/kelas-selector'

const ujianSchema = z.object({
  name: z.string().min(3, 'Nama ujian minimal 3 karakter'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Durasi minimal 1 menit').max(480, 'Durasi maksimal 8 jam'),
  selected_soal: z.array(z.string()).min(1, 'Pilih minimal 1 soal'),
  kelas_id: z.string().nullable().optional(),
})

type UjianForm = z.infer<typeof ujianSchema>

interface SoalItemProps {
  soal: any
  isSelected: boolean
  onToggle: (soalId: string) => void
}

function SoalItem({ soal, isSelected, onToggle }: SoalItemProps) {
  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'hard': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
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
    <Card className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10' : 'hover:shadow-md'}`}>
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

function SoalSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-1" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-16 flex-1" />
              <div className="flex gap-1">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface MultiSelectTagProps {
  options: string[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
}

function MultiSelectTag({ options, selected, onSelectionChange, placeholder = "Pilih tag..." }: MultiSelectTagProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onSelectionChange(selected.filter(t => t !== tag))
    } else {
      onSelectionChange([...selected, tag])
    }
  }

  const displayText = selected.length === 0 
    ? placeholder 
    : selected.length === 1 
      ? selected[0] 
      : `${selected.length} tag dipilih`

  return (
    <div className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-40 justify-between"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {isOpen && (
        <div className="absolute top-full left-0 z-50 w-60 mt-1 bg-background border rounded-md shadow-lg">
          <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-2">
                Tidak ada tag tersedia
              </div>
            ) : (
              options.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selected.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                  >
                    {tag}
                  </label>
                </div>
              ))
            )}
            {selected.length > 0 && (
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectionChange([])}
                  className="w-full"
                >
                  Hapus semua
                </Button>
              </div>
            )}
          </div>
          {/* Backdrop to close dropdown */}
          <div 
            className="fixed inset-0 z-[-1]" 
            onClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  )
}

export default function CreateUjianPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string[]>([])
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')

  const createUjianMutation = useCreateUjian()
  const { data: soalData, isLoading: isLoadingSoal } = useSoalList({
    limit: 100  // Load more for selection
  })

  const form = useForm<UjianForm>({
    resolver: zodResolver(ujianSchema),
    defaultValues: {
      name: '',
      description: '',
      duration_minutes: 60, // Default 1 jam
      selected_soal: [],
      kelas_id: null,
    },
  })

  const selectedSoalIds = form.watch('selected_soal')

  // Get unique tags for filter dropdown
  const availableTags = Array.from(new Set(
    soalData?.data?.flatMap(soal => soal.tags || []) || []
  )).sort()

  // Enhanced filtering function
  const getFilteredSoal = () => {
    if (!soalData?.data) return []

    return soalData.data.filter(soal => {
      // Question type filter
      const matchesType = filterType === 'all' || soal.question_type === filterType

      // Tag filter - support multiple tags
      const matchesTag = filterTag.length === 0 || filterTag.some(tag => soal.tags?.includes(tag))

      // Difficulty filter
      const matchesDifficulty = filterDifficulty === 'all' || soal.difficulty_level === filterDifficulty

      return matchesType && matchesTag && matchesDifficulty
    })
  }

  const filteredSoal = getFilteredSoal()

  // Clear filters function
  const clearFilters = () => {
    setFilterType('all')
    setFilterTag([])
    setFilterDifficulty('all')
  }

  // Check if any filters are active
  const hasActiveFilters = filterType !== 'all' || filterTag.length > 0 || filterDifficulty !== 'all'

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

    const allIds = filteredSoal.map(soal => soal.id)
    const isAllSelected = allIds.every(id => selectedSoalIds.includes(id))

    if (isAllSelected) {
      // Deselect all filtered
      form.setValue('selected_soal', selectedSoalIds.filter(id => !allIds.includes(id)))
    } else {
      // Select all filtered
      const newSelected = [...new Set([...selectedSoalIds, ...allIds])]
      form.setValue('selected_soal', newSelected)
    }
  }

  const onSubmit = async (data: UjianForm) => {
    try {
      setError(null)
      console.log('🔄 Creating ujian...', data)

      // Pastikan duration_minutes memiliki nilai valid
      if (!data.duration_minutes || data.duration_minutes === 0) {
        setError('Durasi ujian harus diisi')
        return
      }

      await createUjianMutation.mutateAsync({
        name: data.name,
        description: data.description,
        duration_minutes: data.duration_minutes,
        selected_soal: data.selected_soal,
        kelas_id: data.kelas_id,
      })

      router.push('/guru/ujian')
    } catch (err: any) {
      console.error('❌ Error creating ujian:', err)
      setError(err.message || 'Terjadi kesalahan saat membuat ujian')
    }
  }

  const selectedCount = selectedSoalIds.length
  const totalSoal = soalData?.data?.length || 0

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/guru/ujian" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar Ujian
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Buat Ujian Baru
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Detail Ujian</CardTitle>
                <CardDescription>
                  Isi informasi dasar ujian dan pilih soal yang akan digunakan
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
                      name="kelas_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kelas Target</FormLabel>
                          <FormControl>
                            <KelasSelector
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Pilih kelas atau biarkan kosong untuk ujian global"
                              allowNone={true}
                              showDetails={true}
                            />
                          </FormControl>
                          <FormDescription>
                            Pilih kelas tertentu atau biarkan kosong untuk membuat ujian global yang bisa diakses semua siswa
                          </FormDescription>
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
                                value={field.value === 0 || !field.value ? '' : field.value}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value === '' || value === '0') {
                                    field.onChange('')
                                  } else {
                                    const numValue = parseInt(value)
                                    if (!isNaN(numValue)) {
                                      field.onChange(numValue)
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  // Jika field kosong saat blur, set ke 0 untuk validation
                                  if (!e.target.value) {
                                    field.onChange(0)
                                  }
                                  field.onBlur()
                                }}
                                name={field.name}
                              />
                              <div className="text-xs text-muted-foreground">
                                Durasi dalam menit (minimal 1 menit, maksimal 8 jam/480 menit)
                              </div>
                              {field.value && field.value > 0 && (
                                <div className="text-sm text-primary">
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
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-3 bg-muted/50 dark:bg-muted/30 rounded-md">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {selectedCount} dari {totalSoal} soal dipilih
                              </span>
                            </div>
                            {form.watch('kelas_id') && (
                              <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
                                <Badge variant="secondary" className="text-xs">
                                  Ujian Kelas
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Hanya siswa dari kelas yang dipilih yang dapat mengakses ujian ini
                                </span>
                              </div>
                            )}
                            {!form.watch('kelas_id') && (
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                                <Badge variant="outline" className="text-xs">
                                  Ujian Global
                                </Badge>
                                <span className="text-xs text-muted-foreground dark:text-gray-300">
                                  Semua siswa dapat mengakses ujian ini
                                </span>
                              </div>
                            )}
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
                          disabled={createUjianMutation.isPending}
                          className="flex-1"
                        >
                          {createUjianMutation.isPending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Membuat...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Buat Ujian
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
                  Pilih soal yang akan digunakan dalam ujian ini
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filter Controls */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filter Soal:</span>
                    </div>
                  </div>

                  {/* Filter Controls Row */}
                  <div className="flex items-center gap-4 p-4 bg-muted/50 dark:bg-muted/30 rounded-lg">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Tipe Soal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Tipe</SelectItem>
                        <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                        {/* <SelectItem value="short_answer">Isian Singkat</SelectItem> */}
                      </SelectContent>
                    </Select>

                    <MultiSelectTag
                      options={availableTags}
                      selected={filterTag}
                      onSelectionChange={setFilterTag}
                      placeholder="Pilih tag..."
                    />

                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Tingkat Kesulitan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Tingkat</SelectItem>
                        <SelectItem value="easy">Mudah</SelectItem>
                        <SelectItem value="medium">Sedang</SelectItem>
                        <SelectItem value="hard">Sulit</SelectItem>
                      </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        Hapus Filter
                      </Button>
                    )}
                  </div>

                  {/* Results Info with Select All Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Menampilkan {getFilteredSoal().length} dari {totalSoal} soal
                      {hasActiveFilters && (
                        <span className="ml-2 text-primary">
                          (dengan filter aktif)
                        </span>
                      )}
                      {filterTag.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="text-xs">Tag dipilih:</span>
                          {filterTag.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                              <button
                                type="button"
                                className="ml-1 hover:bg-muted-foreground/20 rounded-full"
                                onClick={() => setFilterTag(filterTag.filter(t => t !== tag))}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={getFilteredSoal().length === 0}
                    >
                      {getFilteredSoal().every(soal => selectedSoalIds.includes(soal.id))
                        ? 'Batalkan Semua'
                        : 'Pilih Semua'
                      }
                    </Button>
                  </div>
                </div>

                {/* Soal List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {isLoadingSoal ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <SoalSkeleton key={i} />
                    ))
                  ) : getFilteredSoal().length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        {hasActiveFilters ? (
                          <>Tidak ada soal yang sesuai dengan filter yang dipilih</>
                        ) : (
                          <>Belum ada soal. Buat soal terlebih dahulu.</>
                        )}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                          className="mt-3"
                        >
                          Hapus semua filter
                        </Button>
                      ) : (
                        <Button asChild className="mt-3">
                          <Link href="/guru/soal/new">
                            Buat Soal Pertama
                          </Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    getFilteredSoal().map((soal) => (
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
      </div>
    </GuruLayout>
  )
}