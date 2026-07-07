'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHasilUjianDetail, useUpdateScore } from '@/hooks/use-hasil-ujian'
import { GuruLayout } from '@/components/layout/guru-layout'
import { useBatchAIGrading } from '@/hooks/use-jawaban'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  ArrowLeft,
  Users,
  FileText,
  Edit,
  Save,
  X,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Award,
  Download,
  Bot,
  Search,
  Filter
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { exportHasilUjianToExcel } from '@/lib/export-excel'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface ScoringDialogProps {
  jawaban: any
  onScoreUpdate: (jawabanId: string, score: number, feedback?: string) => Promise<void>
}

function ScoringDialog({ jawaban, onScoreUpdate }: ScoringDialogProps) {
  const [score, setScore] = useState(jawaban.score?.toString() || '')
  const [feedback, setFeedback] = useState(jawaban.ai_feedback || '')
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const numScore = parseInt(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast.error('Nilai harus antara 0-100')
      return
    }

    setIsSubmitting(true)
    try {
      await onScoreUpdate(jawaban.id, numScore, feedback.trim() || undefined)
      setIsOpen(false)
    } catch (error: unknown) {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Pilihan Ganda'
      case 'essay':
        return 'Essay'
      default:
        return type
    }
  }

  const renderAnswer = () => {
    if (jawaban.is_unanswered) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">Jawaban Siswa:</div>
          <div className="p-3 bg-muted/50 dark:bg-muted/30 border border-dashed rounded-md text-muted-foreground italic">
            Siswa tidak menjawab soal ini
          </div>
          <div className="text-sm mt-4">
            <div className="font-medium text-green-600 dark:text-green-400">Jawaban Benar:</div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              {jawaban.soal?.question_type === 'multiple_choice' 
                ? `${jawaban.soal.correct_answer}. ${jawaban.soal.options?.find((opt: any) => opt.id === jawaban.soal.correct_answer)?.text || ''}`
                : jawaban.soal?.correct_answer || 'Tidak ada kunci jawaban'}
            </div>
          </div>
        </div>
      )
    }

    if (jawaban.soal?.question_type === 'multiple_choice') {
      const selectedOption = jawaban.soal.options?.find((opt: any) => opt.id === jawaban.answer_text)
      const correctOption = jawaban.soal.options?.find((opt: any) => opt.id === jawaban.soal.correct_answer)
      
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium">Jawaban Siswa:</div>
              <div className={`p-2 rounded border ${jawaban.answer_text === jawaban.soal.correct_answer ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                {jawaban.answer_text}. {selectedOption?.text || jawaban.answer_text}
                {jawaban.answer_text === jawaban.soal.correct_answer && (
                  <CheckCircle className="inline h-4 w-4 ml-2 text-green-600 dark:text-green-400" />
                )}
                {jawaban.answer_text !== jawaban.soal.correct_answer && (
                  <XCircle className="inline h-4 w-4 ml-2 text-red-600 dark:text-red-400" />
                )}
              </div>          {jawaban.answer_text !== jawaban.soal.correct_answer && (
            <div className="text-sm">
              <div className="font-medium text-green-600 dark:text-green-400">Jawaban Benar:</div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                {jawaban.soal.correct_answer}. {correctOption?.text || jawaban.soal.correct_answer}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Jawaban Siswa:</div>
        <div className="p-3 bg-muted/50 dark:bg-muted/30 border rounded-md whitespace-pre-wrap">
          {jawaban.answer_text}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          {jawaban.score !== null ? 'Edit Nilai' : 'Beri Nilai'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Penilaian Jawaban</DialogTitle>
          <DialogDescription>
            Berikan nilai dan feedback untuk jawaban siswa
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Question */}
          <div>
            <Label className="text-sm font-medium">Soal:</Label>
            <div className="mt-1 p-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getQuestionTypeLabel(jawaban.soal?.question_type)}
                </Badge>
              </div>
              <div className="whitespace-pre-wrap">{jawaban.soal?.question_text}</div>
            </div>
          </div>

          {/* Answer */}
          {renderAnswer()}

          {/* Current AI Feedback */}
          {jawaban.ai_feedback && (
            <div>
              <Label className="text-sm font-medium">Feedback AI:</Label>
              <div className="mt-1 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                {jawaban.ai_feedback}
              </div>
            </div>
          )}

          {/* Score Input */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="score">Nilai (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="Masukkan nilai..."
              />
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-2">
                {jawaban.score !== null ? (
                  <Badge className="bg-brand-100 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300">Sudah Dinilai</Badge>
                ) : (
                  <Badge variant="outline">Belum Dinilai</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Feedback Input */}
          <div>
            <Label htmlFor="feedback">Feedback untuk Siswa (Opsional)</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Berikan feedback constructive untuk siswa..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-1" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Nilai'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SiswaResultCardProps {
  siswaResult: any
  onScoreUpdate: (jawabanId: string, score: number, feedback?: string) => Promise<void>
}

function SiswaResultCard({ siswaResult, onScoreUpdate }: SiswaResultCardProps) {
  const isBelumMengerjakan = siswaResult.status === 'Belum Mengerjakan'

  return (
    <Card className={isBelumMengerjakan ? "opacity-75" : ""}>
      <CardHeader className={isBelumMengerjakan ? "pb-6" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {siswaResult.siswa.full_name}
            </CardTitle>
            <CardDescription>{siswaResult.siswa.email}</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
              {isBelumMengerjakan ? (
                <Badge variant="outline" className="bg-muted text-muted-foreground">Belum Mengerjakan</Badge>
              ) : (
                <>
                  <Award className="h-4 w-4" />
                  <span>Nilai:</span>
                </>
              )}
            </div>
            {!isBelumMengerjakan && (
              <div className="text-2xl font-bold">
                {siswaResult.averageScore !== null ? siswaResult.averageScore : '-'}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {!isBelumMengerjakan && (
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium">{siswaResult.totalJawaban}</div>
            <div className="text-muted-foreground">Jawaban</div>
          </div>
          <div className="text-center">
            <div className="font-medium">{siswaResult.jawabanDinilai}</div>
            <div className="text-muted-foreground">Dinilai</div>
          </div>
          <div className="text-center">
            <div className="font-medium">
              {siswaResult.totalJawaban - siswaResult.jawabanDinilai}
            </div>
            <div className="text-muted-foreground">Menunggu</div>
          </div>
        </div>

        {/* Last Attempt */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
          <Clock className="h-4 w-4" />
          <span>Dikerjakan: {format(new Date(siswaResult.lastAttempt), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
        </div>

        {/* Jawaban List */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Jawaban:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {siswaResult.jawaban.map((jawaban: any, index: number) => (
              <div key={jawaban.id} className="flex items-center justify-between p-2 bg-muted/50 dark:bg-muted/30 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Soal {index + 1}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {jawaban.soal?.question_type === 'multiple_choice' ? 'PG' : 'Essay'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {jawaban.soal?.question_text?.substring(0, 60)}...
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {jawaban.is_unanswered ? (
                    <Badge variant="outline" className="text-muted-foreground border-dashed">Tidak Dijawab</Badge>
                  ) : jawaban.score !== null ? (
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {jawaban.score}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Belum dinilai</Badge>
                  )}
                  <ScoringDialog 
                    jawaban={jawaban} 
                    onScoreUpdate={onScoreUpdate}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function HasilUjianDetail() {
  const params = useParams()
  const router = useRouter()
  const ujianId = params.id as string
  
  const { data: hasilData, isLoading, refetch } = useHasilUjianDetail(ujianId)
  const updateScoreMutation = useUpdateScore()
  const batchAIGrading = useBatchAIGrading()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleScoreUpdate = async (jawabanId: string, score: number, feedback?: string) => {
    try {
      await updateScoreMutation.mutateAsync({ jawabanId, score, feedback })
      toast.success('Nilai berhasil diperbarui')
    } catch (error: any) {
      const errorMessage = error?.message || 'Gagal memperbarui nilai'
      toast.error(errorMessage)
    }
  }

  const handleBatchAIGrading = async () => {
    try {
      await batchAIGrading.mutateAsync({
        ujianId,
        options: {
          useOptimized: true,
          useBatching: true,
          forceAI: false
        }
      })
      // Refetch data setelah grading selesai
      refetch()
    } catch (_error) {
      // Error handled by mutation
    }
  }

  if (isLoading) {
    return (
      <GuruLayout>
        <div className="p-6">
          <DetailSkeleton />
        </div>
      </GuruLayout>
    )
  }

  if (!hasilData) {
    return (
      <GuruLayout>
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Ujian tidak ditemukan</p>
          </div>
        </div>
      </GuruLayout>
    )
  }

  const { ujian, siswaResults } = hasilData
  
  // Calculate statistics
  const totalSiswa = siswaResults.length
  const siswaMengerjakan = siswaResults.filter(s => s.status === 'Sudah Mengerjakan').length
  const siswaBelumMengerjakan = siswaResults.filter(s => s.status === 'Belum Mengerjakan').length
  const siswaWithScores = siswaResults.filter(s => s.status === 'Sudah Mengerjakan' && s.averageScore !== null).length
  const overallAverage = siswaWithScores > 0 
    ? Math.round(siswaResults.filter((s: any) => s.status === 'Sudah Mengerjakan').reduce((sum: any, s: any) => sum + (s.averageScore || 0), 0) / siswaWithScores)
    : null

  // Filter and search logic
  const filteredResults = siswaResults.filter((s: any) => {
    const matchSearch = s.siswa.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.siswa.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'belum_mengerjakan') return s.status === 'Belum Mengerjakan';
    if (statusFilter === 'sudah_mengerjakan') return s.status === 'Sudah Mengerjakan';
    if (statusFilter === 'belum_dinilai') return s.status === 'Sudah Mengerjakan' && s.averageScore === null;
    
    return true;
  });

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{ujian.name}</h1>
              <p className="text-muted-foreground mt-1">{ujian.description || 'Tidak ada deskripsi'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Siswa Terdaftar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSiswa}</div>
              <p className="text-xs text-muted-foreground">Terdaftar di ujian</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mengerjakan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{siswaMengerjakan}</div>
              <p className="text-xs text-muted-foreground">Sudah mengerjakan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Belum Mulai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{siswaBelumMengerjakan}</div>
              <p className="text-xs text-muted-foreground">Belum mengerjakan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Perlu Penilaian</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{siswaMengerjakan - siswaWithScores}</div>
              <p className="text-xs text-muted-foreground">Belum dinilai</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rata-rata Kelas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallAverage !== null ? overallAverage : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Nilai keseluruhan</p>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h2 className="text-lg font-medium">Hasil Siswa</h2>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="w-full sm:w-[200px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="sudah_mengerjakan">Mengerjakan Ujian</SelectItem>
                    <SelectItem value="belum_mengerjakan">Belum Mengerjakan</SelectItem>
                    <SelectItem value="belum_dinilai">Perlu Penilaian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={async () => exportHasilUjianToExcel(ujian.name, siswaResults)}
                disabled={siswaResults.length === 0}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
          
          {filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {siswaResults.length === 0 
                  ? "Belum ada siswa terdaftar pada ujian ini" 
                  : "Tidak ada siswa yang cocok dengan pencarian/filter"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredResults.map((siswaResult: any) => (
                <SiswaResultCard
                  key={siswaResult.siswa.id}
                  siswaResult={siswaResult}
                  onScoreUpdate={handleScoreUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </GuruLayout>
  )
}
