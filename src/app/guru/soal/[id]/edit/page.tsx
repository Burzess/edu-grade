'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSoalDetail, useUpdateSoal } from '@/hooks/use-soal'
import { GuruOnlyGuard } from '@/components/auth/role-guard'
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
import { useAuthStore } from '@/store/auth'
import { useAuth } from '@/components/providers/auth-provider'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

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
  console.log('🔄 Validating edit soalSchema:', data);
  
  // Jika pilihan ganda, harus ada minimal 2 opsi dan jawaban benar
  if (data.question_type === 'multiple_choice') {
    if (!data.options || data.options.length < 2) {
      console.log('❌ Validation failed: Not enough options');
      return false;
    }
    if (!data.correct_answer) {
      console.log('❌ Validation failed: No correct answer');
      return false;
    }
    // Cek apakah correct_answer ada dalam options
    const optionIds = data.options.map(opt => opt.id);
    if (!optionIds.includes(data.correct_answer)) {
      console.log('❌ Validation failed: Correct answer not in options');
      return false;
    }
  }
  // Untuk essay, options dan correct_answer harus undefined/null
  if (data.question_type === 'essay') {
    if (data.options && data.options.length > 0) {
      console.log('❌ Validation failed: Essay has options');
      return false;
    }
    if (data.correct_answer && data.correct_answer.trim() !== '') {
      console.log('❌ Validation failed: Essay has correct_answer');
      return false;
    }
  }
  console.log('✅ Validation passed');
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
  console.log('🔄 EditSoalPage: Resolved params:', resolvedParams)
  
  const router = useRouter()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()
  const [error, setError] = useState<string | null>(null)
  
  const { data: soal, isLoading, error: fetchError } = useSoalDetail(resolvedParams.id)
  const updateSoalMutation = useUpdateSoal()

  console.log('🔄 EditSoalPage: Query state:', { soal, isLoading, fetchError })

  // Debug timeout untuk memastikan tidak stuck selamanya
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ EditSoalPage: Still loading after 10 seconds, this might be stuck!')
        console.log('Debug info:', { 
          resolvedParamsId: resolvedParams.id, 
          hasUser: !!profile, 
          userEmail: profile?.email 
        })
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [isLoading, resolvedParams.id, profile])

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

  // Handle perubahan question_type
  useEffect(() => {
    if (questionType === 'essay') {
      // Set options dan correct_answer ke undefined untuk essay
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
    const newOptions = [...currentOptions, { id: nextId, text: '' }]
    console.log('🔄 EditSoalPage: Adding option, new options:', newOptions)
    form.setValue('options', newOptions)
  }

  const removeOption = (index: number) => {
    const currentOptions = form.getValues('options') || []
    const newOptions = currentOptions.filter((_, i) => i !== index)
    console.log('🔄 EditSoalPage: Removing option at index', index, 'new options:', newOptions)
    form.setValue('options', newOptions)
    
    // Reset correct_answer jika opsi yang dipilih dihapus
    const correctAnswer = form.getValues('correct_answer')
    const removedOptionId = currentOptions[index]?.id
    if (correctAnswer === removedOptionId) {
      console.log('🔄 EditSoalPage: Resetting correct_answer because removed option was selected')
      form.setValue('correct_answer', '')
    }
  }

  // Update form values when soal data is loaded
  useEffect(() => {
    if (soal) {
      const formData = {
        question_text: soal.question_text,
        question_type: soal.question_type,
        difficulty_level: soal.difficulty_level,
        tags: soal.tags || [],
        options: undefined as any,
        correct_answer: undefined as any,
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
      }

      console.log('🔄 EditSoalPage: Setting form data:', formData)
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
        difficulty_level: data.difficulty_level,
        tags: data.tags || [],
      }

      // Tambahkan options dan correct_answer untuk pilihan ganda
      if (data.question_type === 'multiple_choice') {
        updateData.options = data.options || []
        updateData.correct_answer = data.correct_answer
      } else {
        // Hapus options dan correct_answer untuk essay
        updateData.options = null
        updateData.correct_answer = null
      }

      await updateSoalMutation.mutateAsync(updateData)
      
      router.push('/guru/soal')
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengupdate soal')
    }
  }

  if (isLoading) {
    return (
      <GuruOnlyGuard>
        <div className="min-h-screen bg-gray-50">
        {/* Navigation skeleton */}
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/guru/soal" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Kembali ke Daftar Soal
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Soal
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
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
        </main>
      </div>
      </GuruOnlyGuard>
    )
  }

  if (fetchError) {
    return (
      <GuruOnlyGuard>
        <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/guru/soal" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Kembali ke Daftar Soal
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Soal
                </h1>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Alert variant="destructive">
              <AlertDescription>
                Gagal memuat data soal. Silakan coba lagi atau kembali ke daftar soal.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
      </GuruOnlyGuard>
    )
  }

  return (
    <GuruOnlyGuard>
      <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/guru/soal" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Kembali ke Daftar Soal
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Soal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile?.full_name}
              </span>
              <Button variant="outline" onClick={signOut}>
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <FormField
                      control={form.control}
                      name="difficulty_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tingkat Kesulitan *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
      </main>
    </div>
    </GuruOnlyGuard>
  )
}
