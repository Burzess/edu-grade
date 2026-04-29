'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSoal } from '@/hooks/use-soal'
import { GuruOnlyGuard } from '@/components/auth/role-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagInput } from '@/components/ui/tag-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
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
    // Untuk essay, correct_answer (kunci jawaban) diperbolehkan
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

export default function CreateSoalPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    const createSoalMutation = useCreateSoal()

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
            console.log('Starting soal creation...', data)

            const soalData: any = {
                question_text: data.question_text,
                question_type: data.question_type,
                tags: data.tags || [],
            }

            // Tambahkan options dan correct_answer untuk pilihan ganda
            if (data.question_type === 'multiple_choice') {
                soalData.options = data.options || []
                soalData.correct_answer = data.correct_answer
                console.log('Multiple choice data:', {
                    options: soalData.options,
                    correct_answer: soalData.correct_answer
                })
            } else {
                // Untuk essay
                soalData.options = null
                soalData.correct_answer = data.correct_answer || null
                soalData.rubric = data.rubric || null
            }

            console.log('Sending data to server:', soalData)

            const result = await createSoalMutation.mutateAsync(soalData)
            console.log('Soal created successfully:', result)

            router.push('/guru/soal')
        } catch (err: unknown) {
            console.error('Error creating soal:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat soal')
        }
    }

    return (
        <GuruLayout>
            <div className="p-6 space-y-6">
                <div className="flex items-center space-x-4">
                    <Link href="/guru/soal" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Kembali ke Daftar Soal
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        Buat Soal Baru
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Buat Soal Baru</CardTitle>
                        <CardDescription>
                            Buat soal baru untuk bank soal Anda. Soal akan digunakan untuk membuat ujian.
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
                                                                            <span className="w-8 h-8 rounded-full bg-muted/70 dark:bg-muted/50 flex items-center justify-center text-sm font-medium">
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