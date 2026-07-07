'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSoalDetail, useUpdateSoal } from '@/hooks/use-soal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { GuruLayout } from '@/components/layout/guru-layout'

const soalSchema = z.object({
  question_text: z.string().min(10, 'Pertanyaan minimal 10 karakter'),
  question_type: z.enum(['essay', 'multiple_choice']),
  tags: z.array(z.string()).max(10, 'Maksimal 10 tag').optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, 'Opsi tidak boleh kosong')
  })).optional(),
  correct_answer: z.string().optional(),
  rubric: z.string().optional(),
}).refine((data) => {
  // Jika pilihan ganda, harus ada minimal 2 opsi dan jawaban benar
  if (data.question_type === 'multiple_choice') {
    if (!data.options || data.options.length < 2) {
      return false;
    }
    if (!data.correct_answer) {
      return false;
    }
    // Cek apakah correct_answer ada dalam options
    const optionIds = data.options.map(opt => opt.id);
    if (!optionIds.includes(data.correct_answer)) {
      return false;
    }
  }
  // Untuk essay, correct_answer diperbolehkan
  if (data.question_type === 'essay') {
    if (data.options && data.options.length > 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Untuk soal pilihan ganda, harus ada minimal 2 opsi dan jawaban yang benar harus dipilih",
  path: ["question_type"]
})

type SoalForm = z.infer<typeof soalSchema>

interface EditSoalPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditSoalPage({ params }: EditSoalPageProps) {
  const resolvedParams = use(params)

  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { data: soal, isLoading, error: fetchError } = useSoalDetail(resolvedParams.id)
  const updateSoalMutation = useUpdateSoal()

  // Debug timeout untuk memastikan tidak stuck selamanya
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        // Still loading after 10 seconds - might be stuck
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [isLoading, resolvedParams.id])

  const form = useForm<SoalForm>({
    resolver: zodResolver(soalSchema),
    defaultValues: {
      question_text: '',
      question_type: 'essay',
      tags: [],
      options: undefined,
      correct_answer: undefined,
      rubric: '',
    },
  })

  const questionType = form.watch('question_type')

  // Handle perubahan question_type
  useEffect(() => {
    if (questionType === 'essay') {
      // Set options ke undefined untuk essay, tapi pertahankan correct_answer jika ada
      form.setValue('options', undefined)
    } else if (questionType === 'multiple_choice') {
      // Set default options untuk multiple choice jika belum ada
      const currentOptions = form.getValues('options')
      if (!currentOptions || currentOptions.length === 0) {
        form.setValue('options', [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ])
        form.setValue('correct_answer', '')
      }
    }
  }, [questionType, form])

  const addOption = () => {
    const currentOptions = form.getValues('options') || []
    const nextId = String.fromCharCode(65 + currentOptions.length) // A, B, C, D, E, etc.
    const newOptions = [...currentOptions, { id: nextId, text: '' }]
    form.setValue('options', newOptions)
  }

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options') || []
    const newOptions = currentOptions.filter((_, i) => i !== index)
    form.setValue('options', newOptions)

    // Reset correct_answer jika opsi yang dipilih dihapus
    const correctAnswer = form.getValues('correct_answer')
    const removedOptionId = currentOptions[index]?.id
    if (correctAnswer === removedOptionId) {
      form.setValue('correct_answer', '')
    }
  }

  // Update form values when soal data is loaded
  useEffect(() => {
    if (soal) {
      const formData = {
        question_text: soal.question_text,
        question_type: soal.question_type,
        tags: soal.tags || [],
        options: undefined as any,
        correct_answer: undefined as any,
        rubric: (soal as any).rubric || '',
      }

      // Set options dan correct_answer berdasarkan tipe soal
      if (soal.question_type === 'multiple_choice') {
        formData.options = soal.options || [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' },
        ]
        formData.correct_answer = soal.correct_answer || ''
      } else if (soal.question_type === 'essay') {
        formData.correct_answer = soal.correct_answer || ''
      }

      form.reset(formData)
    }
  }, [soal, form])

  const onSubmit = async (data: SoalForm) => {
    try {
      setError(null)

      const updateData: any = {
        id: resolvedParams.id,
        question_text: data.question_text,
        question_type: data.question_type,
        tags: data.tags || [],
      }

      // Tambahkan options dan correct_answer untuk pilihan ganda
      if (data.question_type === 'multiple_choice') {
        updateData.options = data.options || []
        updateData.correct_answer = data.correct_answer
      } else {
        // Hapus options untuk essay, gunakan correct_answer sebagai reference
        updateData.options = null
        updateData.correct_answer = data.correct_answer || null
        updateData.rubric = data.rubric || null
      }

      await updateSoalMutation.mutateAsync(updateData)

      router.push('/guru/soal')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupdate soal')
    }
  }

  if (isLoading) {
    return (
      <GuruLayout>
        <div className="p-6 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
            <Link href="/guru/soal" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Daftar Soal
            </Link>
            <h1 className="text-xl font-semibold text-foreground">
              Edit Soal
            </h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-32" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-64" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </GuruLayout>
    )
  }

  if (fetchError) {
    return (
      <GuruLayout>
        <div className="p-6 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
            <Link href="/guru/soal" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke Daftar Soal
            </Link>
            <h1 className="text-xl font-semibold text-foreground">
              Edit Soal
            </h1>
          </div>

          <Alert variant="destructive">
            <AlertDescription>
              Gagal memuat data soal. Silakan coba lagi atau kembali ke daftar soal.
            </AlertDescription>
          </Alert>
        </div>
      </GuruLayout>
    )
  }

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center space-x-4">
          <Link href="/guru/soal" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar Soal
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Edit Soal
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Soal</CardTitle>
            <CardDescription>
              Edit soal yang sudah ada. Perubahan akan mempengaruhi ujian yang menggunakan soal ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="question_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pertanyaan *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tuliskan pertanyaan atau soal di sini..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tuliskan pertanyaan yang jelas dan mudah dipahami siswa.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="question_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Soal *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tipe soal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="essay">Essay</SelectItem>
                            <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Pilih tipe soal: Essay untuk jawaban bebas, Pilihan Ganda untuk opsi A, B, C, D.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {questionType === 'essay' && (
                  <FormField
                    control={form.control}
                    name="rubric"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rubrik Penilaian (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Masukkan kriteria atau panduan penilaian untuk soal ini... (Misal: 50% untuk ketepatan teori, 50% untuk contoh relevan)"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Rubrik ini akan digunakan oleh AI untuk menilai jawaban essay secara lebih akurat sesuai standar Anda.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Kunci Jawaban Essay */}
                {questionType === 'essay' && (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                    <h4 className="text-sm font-medium text-foreground">Kunci Jawaban Essay (Opsional)</h4>
                    <p className="text-sm text-muted-foreground">
                      Berikan kunci jawaban untuk membantu AI melakukan penilaian yang lebih akurat.
                    </p>
                    <FormField
                      control={form.control}
                      name="correct_answer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kunci Jawaban</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tuliskan kunci jawaban atau poin-poin utama yang harus ada dalam jawaban siswa..."
                              className="min-h-[100px]"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Kosongkan jika ingin AI menilai secara bebas tanpa referensi khusus.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Options untuk Multiple Choice */}
                {questionType === 'multiple_choice' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <FormLabel>Opsi Jawaban *</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addOption}
                        disabled={(form.getValues('options')?.length || 0) >= 6}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Tambah Opsi
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="options"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-3">
                              {(field.value || []).map((option, index) => (
                                <div key={index} className="flex items-center space-x-3">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                                        {option.id}
                                      </span>
                                      <Input
                                        placeholder={`Opsi ${option.id}`}
                                        value={option.text}
                                        onChange={(e) => {
                                          const newOptions = [...(field.value || [])]
                                          newOptions[index] = { ...option, text: e.target.value }
                                          field.onChange(newOptions)
                                        }}
                                      />
                                      {(field.value || []).length > 2 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeOption(index)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="correct_answer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jawaban Benar *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              className="flex flex-wrap gap-4"
                            >
                              {(form.getValues('options') || []).map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                  <RadioGroupItem value={option.id} id={`correct-${option.id}`} />
                                  <Label htmlFor={`correct-${option.id}`} className="cursor-pointer">
                                    Opsi {option.id}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Pilih opsi mana yang merupakan jawaban benar.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <TagInput
                          value={field.value || []}
                          onChange={field.onChange}
                          placeholder="Tambah tag untuk kategori soal..."
                          maxTags={10}
                        />
                      </FormControl>
                      <FormDescription>
                        Tag membantu mengorganisir dan mencari soal. Contoh: "matematika", "aljabar", "kelas-10"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-6 border-t">
                  <div className="flex justify-end space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/guru/soal')}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateSoalMutation.isPending}
                    >
                      {updateSoalMutation.isPending ? (
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
    </GuruLayout>
  )
}
