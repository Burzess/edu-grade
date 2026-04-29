'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSoalDetail, useUpdateSoal } from '@/hooks/use-soal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Save, Plus, Trash2, Loader2 } from 'lucide-react'

const soalSchema = z.object({
  question_text: z.string().min(10, 'Pertanyaan minimal 10 karakter'),
  question_type: z.enum(['essay', 'multiple_choice']),
  tags: z.array(z.string()).max(10, 'Maksimal 10 tag').optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string().min(1, 'Opsi tidak boleh kosong'),
  })).optional(),
  correct_answer: z.string().optional(),
  rubric: z.string().optional(),
}).refine((data) => {
  if (data.question_type === 'multiple_choice') {
    if (!data.options || data.options.length < 2) return false
    if (!data.correct_answer) return false
    const optionIds = data.options.map(opt => opt.id)
    if (!optionIds.includes(data.correct_answer)) return false
  }
  // Essay: correct_answer opsional sebagai kunci/referensi jawaban
  return true
}, {
  message: 'Untuk soal pilihan ganda, harus ada minimal 2 opsi dan jawaban yang benar harus dipilih',
  path: ['question_type'],
})

type SoalForm = z.infer<typeof soalSchema>

interface EditSoalModalProps {
  soalId: string
  children: React.ReactNode
}

export function EditSoalModal({ soalId, children }: EditSoalModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: soal, isLoading, error: fetchError } = useSoalDetail(open ? soalId : '')
  const updateSoalMutation = useUpdateSoal()

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
      // Bersihkan options saat pindah ke essay, kunci jawaban tetap dipertahankan
      form.setValue('options', undefined)
    } else if (questionType === 'multiple_choice') {
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

  // Isi form saat data soal berhasil dimuat
  useEffect(() => {
    if (soal) {
      const formData: any = {
        question_text: soal.question_text,
        question_type: soal.question_type,
        tags: soal.tags || [],
        options: undefined,
        correct_answer: undefined,
        rubric: (soal as any).rubric || '',
      }
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

  // Reset form & error saat modal ditutup
  const handleOpenChange = (val: boolean) => {
    setOpen(val)
    if (!val) {
      setError(null)
      form.reset()
    }
  }

  const addOption = () => {
    const currentOptions = form.getValues('options') || []
    const nextId = String.fromCharCode(65 + currentOptions.length)
    form.setValue('options', [...currentOptions, { id: nextId, text: '' }])
  }

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options') || []
    const removedId = currentOptions[index]?.id
    const newOptions = currentOptions.filter((_, i) => i !== index)
    form.setValue('options', newOptions)
    if (form.getValues('correct_answer') === removedId) {
      form.setValue('correct_answer', '')
    }
  }

  const onSubmit = async (data: SoalForm) => {
    try {
      setError(null)
      const updateData: any = {
        id: soalId,
        question_text: data.question_text,
        question_type: data.question_type,
        tags: data.tags || [],
      }
      if (data.question_type === 'multiple_choice') {
        updateData.options = data.options || []
        updateData.correct_answer = data.correct_answer
      } else {
        updateData.options = null
        updateData.correct_answer = data.correct_answer || null
        updateData.rubric = data.rubric || null
      }
      await updateSoalMutation.mutateAsync(updateData)
      setOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengupdate soal')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border dark:bg-background/90 dark:backdrop-blur-md dark:border-border/50">
        <DialogHeader>
          <DialogTitle>Edit Soal</DialogTitle>
          <DialogDescription>
            Edit soal yang sudah ada. Perubahan akan mempengaruhi ujian yang menggunakan soal ini.
          </DialogDescription>
        </DialogHeader>

        {fetchError && (
          <Alert variant="destructive">
            <AlertDescription>Gagal memuat data soal. Silakan tutup dan coba lagi.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">

              {/* Pertanyaan */}
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

              {/* Tipe Soal */}
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

              {/* Opsi Pilihan Ganda */}
              {questionType === 'multiple_choice' && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                  <FormField
                    control={form.control}
                    name="options"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>Pilihan Jawaban *</FormLabel>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addOption}
                            disabled={(form.getValues('options') || []).length >= 6}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Tambah Opsi
                          </Button>
                        </div>
                        <FormControl>
                          <div className="space-y-3">
                            {(field.value || []).map((option, index) => (
                              <div key={option.id} className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-muted/70 dark:bg-muted/50 flex items-center justify-center text-sm font-medium shrink-0">
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
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
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
                                <RadioGroupItem value={option.id} id={`edit-correct-${option.id}`} />
                                <Label htmlFor={`edit-correct-${option.id}`} className="cursor-pointer">
                                  Opsi {option.id}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>Pilih opsi mana yang merupakan jawaban benar.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                          Rubrik ini akan digunakan oleh AI untuk menilai jawaban essay secara lebih akurat.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (Opsional)</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Tambah tag untuk kategori soal..."
                        maxTags={10}
                      />
                    </FormControl>
                    <FormDescription>
                      Maksimal 10 tag untuk membantu kategorisasi soal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={updateSoalMutation.isPending || isLoading || !!fetchError}
            onClick={form.handleSubmit(onSubmit)}
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
