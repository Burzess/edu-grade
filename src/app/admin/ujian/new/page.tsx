'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateUjian } from '@/hooks/use-ujian'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Save, Clock, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { AdminLayout } from '@/components/layout/admin-layout'
import { MultiKelasSelector } from '@/components/ui/kelas-selector'
import GuruSelector from '@/components/ui/guru-selector'
import { loadGuruPreferences } from '@/lib/guru-preferences'

const ujianSchema = z.object({
  name: z.string().min(3, 'Nama ujian minimal 3 karakter'),
  description: z.string().optional(),
  duration_minutes: z.number().min(1, 'Durasi minimal 1 menit').max(480, 'Durasi maksimal 8 jam'),
  start_time: z.string().min(1, 'Waktu mulai harus diisi'),
  end_time: z.string().min(1, 'Waktu selesai harus diisi'),
  kelas_ids: z.array(z.string()),
  guru_id: z.string({ required_error: 'Guru pengampu harus dipilih' }).min(1, 'Guru pengampu harus dipilih'),
  allow_remidi: z.boolean(),
  max_attempts: z.number().min(0, 'Minimal 0 percobaan (Unlimited)').max(10, 'Maksimal 10 percobaan'),
})

type UjianForm = z.infer<typeof ujianSchema>

export default function AdminCreateUjianPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const createUjianMutation = useCreateUjian()

  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const formatDateTimeLocal = (date: Date) => 
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

  const form = useForm<UjianForm>({
    resolver: zodResolver(ujianSchema),
    defaultValues: {
      name: '',
      description: '',
      duration_minutes: 60, // Default 1 jam
      start_time: formatDateTimeLocal(new Date(now.getTime() + 10 * 60000)), // Default +10 mins
      end_time: formatDateTimeLocal(new Date(now.getTime() + 130 * 60000)), // Default +2 hours 10 mins
      kelas_ids: [],
      guru_id: '',
      allow_remidi: false,
      max_attempts: 2,
    },
  })

  useEffect(() => {
    if (form.formState.isDirty) return

    const preferences = loadGuruPreferences()
    const duration = preferences.examDefaults.defaultDuration

    if (Number.isFinite(duration) && duration > 0) {
      form.setValue('duration_minutes', duration, { shouldDirty: false })
    }
  }, [form, form.formState.isDirty])

  const onSubmit = async (data: UjianForm) => {
    try {
      setError(null)

      if (!data.duration_minutes || data.duration_minutes === 0) {
        setError('Durasi ujian harus diisi')
        return
      }

      const startDate = new Date(data.start_time)
      const endDate = new Date(data.end_time)

      if (endDate <= startDate) {
        setError('Waktu selesai harus setelah waktu mulai')
        return
      }

      await createUjianMutation.mutateAsync({
        name: data.name,
        description: data.description,
        duration_minutes: data.duration_minutes,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        kelas_ids: data.kelas_ids,
        guru_id: data.guru_id,
        allow_remidi: data.allow_remidi,
        max_attempts: data.allow_remidi ? data.max_attempts : 1,
      })

      router.push('/admin/ujian')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat jadwal ujian')
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/admin/ujian" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar Ujian
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Buat Jadwal Ujian Baru
          </h1>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Detail Jadwal Ujian</CardTitle>
              <CardDescription>
                Isi informasi dasar jadwal ujian. Konten soal akan dikelola oleh Guru setelah jadwal dibuat.
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
                    name="kelas_ids"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kelas Target</FormLabel>
                        <FormControl>
                          <MultiKelasSelector
                            value={field.value}
                            onValueChange={field.onChange}
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
                    name="guru_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guru Pengampu *</FormLabel>
                        <FormControl>
                          <GuruSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Pilih guru yang akan membuat soal"
                          />
                        </FormControl>
                        <FormDescription>
                          Pilih guru yang akan bertanggung jawab memasukkan bank soal untuk ujian ini
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="start_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Mulai Tersedia *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormDescription>Kapan ujian ini mulai bisa diakses siswa</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Selesai Tersedia *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormDescription>Batas akhir siswa bisa memulai ujian</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  {/* Remidi Settings */}
                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <RotateCcw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Pengaturan Remidi</span>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="allow_remidi"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">Izinkan Remidi</FormLabel>
                            <FormDescription className="text-xs">
                              Siswa dapat mengulang ujian ini. Nilai tertinggi yang diambil.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('allow_remidi') && (
                      <FormField
                        control={form.control}
                        name="max_attempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Maksimal Percobaan</FormLabel>
                            <Select 
                              value={field.value.toString()} 
                              onValueChange={(val) => field.onChange(parseInt(val))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih batas percobaan" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">Unlimited (Tidak Terbatas)</SelectItem>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num} Percobaan
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              Jumlah total percobaan termasuk ujian pertama.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/admin/ujian')}
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
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Buat Jadwal
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
      </div>
    </AdminLayout>
  )
}