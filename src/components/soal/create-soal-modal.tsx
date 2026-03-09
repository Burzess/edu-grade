'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSoal } from '@/hooks/use-soal'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Save, Plus, Trash2 } from 'lucide-react'

const soalSchema = z.object({
    question_text: z.string().min(10, 'Pertanyaan minimal 10 karakter'),
    question_type: z.enum(['essay', 'multiple_choice']),
    tags: z.array(z.string()).max(10, 'Maksimal 10 tag').optional(),
    options: z.array(z.object({
        id: z.string(),
        text: z.string().min(1, 'Opsi tidak boleh kosong')
    })).optional(),
    correct_answer: z.string().optional(),
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
    // Untuk essay, correct_answer opsional (bisa digunakan sebagai referensi)
    return true;
}, {
    message: "Data soal tidak valid",
})

type SoalForm = z.infer<typeof soalSchema>

interface CreateSoalModalProps {
  children: React.ReactNode
}

export function CreateSoalModal({ children }: CreateSoalModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const createSoalMutation = useCreateSoal()

  const form = useForm<SoalForm>({
    resolver: zodResolver(soalSchema),
    defaultValues: {
      question_text: '',
      question_type: 'essay',
      tags: [],
      options: [],
      correct_answer: '',
    }
  })

  const questionType = form.watch('question_type')

  // Reset form ketika tipe soal berubah
  useEffect(() => {
    if (questionType === 'multiple_choice') {
      if (!form.getValues('options') || form.getValues('options')?.length === 0) {
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
    form.setValue('options', [...currentOptions, { id: nextId, text: '' }])
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

  const onSubmit = async (data: SoalForm) => {
    try {
      setError(null)
      console.log('🔄 Starting soal creation...', data)

      const soalData: any = {
        question_text: data.question_text,
        question_type: data.question_type,
        tags: data.tags || [],
      }

      // Tambahkan options dan correct_answer sesuai tipe soal
      if (data.question_type === 'multiple_choice') {
        soalData.options = data.options || []
        soalData.correct_answer = data.correct_answer
      } else {
        // Untuk essay, gunakan correct_answer sebagai reference answer (opsional)
        soalData.options = null
        soalData.correct_answer = data.correct_answer || null // Bisa kosong untuk essay
      }

      console.log('📤 Sending data to server:', soalData)

      await createSoalMutation.mutateAsync(soalData)
      
      console.log('✅ Soal created successfully')
      setOpen(false)
      form.reset()
      
    } catch (error: unknown) {
      console.error('❌ Error creating soal:', error)
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-sm border-border dark:bg-background/90 dark:backdrop-blur-md dark:border-border/50">
        <DialogHeader>
          <DialogTitle>Buat Soal Baru</DialogTitle>
          <DialogDescription>
            Buat soal baru untuk ujian. Pilih tipe soal dan isi pertanyaan dengan lengkap.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question Text */}
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pertanyaan *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tulis pertanyaan soal di sini..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Type */}
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Soal *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe soal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essay">Essay</SelectItem>
                        <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multiple Choice Options */}
            {questionType === 'multiple_choice' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="options"
                  render={() => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Pilihan Jawaban *</FormLabel>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addOption}
                          disabled={(form.getValues('options') || []).length >= 6}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Tambah Opsi
                        </Button>
                      </div>
                      <FormControl>
                        <div className="space-y-3">
                          {(form.getValues('options') || []).map((option, index) => (
                            <div key={option.id} className="space-y-2">
                              <Label>Opsi {option.id}</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder={`Opsi ${option.id}`}
                                  value={option.text}
                                  onChange={(e) => {
                                    const currentOptions = form.getValues('options') || []
                                    const newOptions = [...currentOptions]
                                    newOptions[index] = { ...option, text: e.target.value }
                                    form.setValue('options', newOptions)
                                  }}
                                />
                                {(form.getValues('options') || []).length > 2 && (
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

            {/* Essay Reference Answer Section */}
            {questionType === 'essay' && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30 dark:bg-muted/20">
                <h4 className="text-sm font-medium text-foreground">Kunci Jawaban Essay (Opsional)</h4>
                <p className="text-sm text-muted-foreground">
                  Berikan kunci jawaban untuk membantu AI melakukan penilaian yang lebih akurat dan konsisten.
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
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Kunci jawaban ini akan digunakan AI sebagai referensi untuk menilai jawaban siswa. 
                        Kosongkan jika ingin AI menilai secara bebas tanpa referensi khusus.
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
                  <FormLabel>Tags (Opsional)</FormLabel>
                  <FormControl>
                    <TagInput
                      value={field.value || []}
                      onChange={field.onChange}
                      placeholder="Tambah tag untuk kategorisasi soal"
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

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Batal
          </Button>
          <Button 
            type="submit"
            disabled={createSoalMutation.isPending}
            onClick={form.handleSubmit(onSubmit)}
          >
            {createSoalMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Simpan Soal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
