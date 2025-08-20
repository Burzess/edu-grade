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
    difficulty_level: z.enum(['easy', 'medium', 'hard']),
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
    // Untuk essay, options dan correct_answer harus undefined/null
    if (data.question_type === 'essay') {
        if (data.options && data.options.length > 0) {
            return false;
        }
        if (data.correct_answer && data.correct_answer.trim() !== '') {
            return false;
        }
    }
    return true;
}, {
    message: "Untuk soal pilihan ganda, harus ada minimal 2 opsi dan jawaban yang benar harus dipilih",
    path: ["question_type"]
})

type SoalForm = z.infer<typeof soalSchema>

interface CreateSoalModalProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function CreateSoalModal({ trigger, onSuccess }: CreateSoalModalProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSoalMutation = useCreateSoal()

  const form = useForm<SoalForm>({
    resolver: zodResolver(soalSchema),
    defaultValues: {
      question_text: '',
      question_type: 'essay',
      difficulty_level: 'medium',
      tags: [],
      options: undefined,
      correct_answer: undefined,
    },
  })

  const questionType = form.watch('question_type')

  // Reset options ketika question_type berubah
  useEffect(() => {
    if (questionType === 'essay') {
      form.setValue('options', undefined)
      form.setValue('correct_answer', undefined)
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
        difficulty_level: data.difficulty_level,
        tags: data.tags || [],
      }

      // Tambahkan options dan correct_answer untuk pilihan ganda
      if (data.question_type === 'multiple_choice') {
        soalData.options = data.options || []
        soalData.correct_answer = data.correct_answer
      } else {
        // Untuk essay, set null/undefined
        soalData.options = null
        soalData.correct_answer = null
      }

      console.log('📤 Sending data to server:', soalData)

      await createSoalMutation.mutateAsync(soalData)
      console.log('✅ Soal created successfully')

      // Reset form and close modal
      form.reset()
      setOpen(false)
      setError(null)
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error('❌ Error creating soal:', err)
      setError(err.message || 'Terjadi kesalahan saat membuat soal')
    }
  }

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Buat Soal Baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Soal Baru</DialogTitle>
          <DialogDescription>
            Buat soal baru untuk bank soal Anda. Soal akan digunakan untuk membuat ujian.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="question_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Soal *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              <FormField
                control={form.control}
                name="difficulty_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tingkat Kesulitan *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tingkat kesulitan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Mudah</SelectItem>
                        <SelectItem value="medium">Sedang</SelectItem>
                        <SelectItem value="hard">Sulit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Bantu kategorikan tingkat kesulitan soal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createSoalMutation.isPending}
          >
            {createSoalMutation.isPending ? (
              'Menyimpan...'
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
