'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useHasilUjianDetail, useUpdateScore } from '@/hooks/use-hasil-ujian'
import { GuruLayout } from '@/components/layout/guru-layout'
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
  Award
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'

interface ScoringDialogProps {
  jawaban: any
  onScoreUpdate: (jawabanId: string, score: number, feedback?: string) => void
}

function ScoringDialog({ jawaban, onScoreUpdate }: ScoringDialogProps) {
  const [score, setScore] = useState(jawaban.score?.toString() || '')
  const [feedback, setFeedback] = useState(jawaban.ai_feedback || '')
  const [isOpen, setIsOpen] = useState(false)

  const handleSubmit = () => {
    const numScore = parseInt(score)
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast.error('Nilai harus antara 0-100')
      return
    }

    onScoreUpdate(jawaban.id, numScore, feedback.trim() || undefined)
    setIsOpen(false)
    toast.success('Nilai berhasil diperbarui')
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
            <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
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
                  <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Sudah Dinilai</Badge>
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
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-1" />
              Simpan Nilai
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface SiswaResultCardProps {
  siswaResult: any
  onScoreUpdate: (jawabanId: string, score: number, feedback?: string) => void
}

function SiswaResultCard({ siswaResult, onScoreUpdate }: SiswaResultCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {siswaResult.siswa.full_name}
            </CardTitle>
            <CardDescription>{siswaResult.siswa.email}</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>Nilai:</span>
            </div>
            <div className="text-2xl font-bold">
              {siswaResult.averageScore !== null ? siswaResult.averageScore : '-'}
            </div>
          </div>
        </div>
      </CardHeader>

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
                  {jawaban.score !== null ? (
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
  
  const { data: hasilData, isLoading } = useHasilUjianDetail(ujianId)
  const updateScoreMutation = useUpdateScore()

  const handleScoreUpdate = async (jawabanId: string, score: number, feedback?: string) => {
    try {
      await updateScoreMutation.mutateAsync({ jawabanId, score, feedback })
    } catch (error) {
      toast.error('Gagal memperbarui nilai')
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
  const siswaWithScores = siswaResults.filter(s => s.averageScore !== null).length
  const overallAverage = siswaWithScores > 0 
    ? Math.round(siswaResults.reduce((sum, s) => sum + (s.averageScore || 0), 0) / siswaWithScores)
    : null

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{ujian.name}</h1>
            <p className="text-muted-foreground">{ujian.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSiswa}</div>
              <p className="text-xs text-muted-foreground">Mengerjakan ujian</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sudah Dinilai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{siswaWithScores}</div>
              <p className="text-xs text-muted-foreground">Siswa selesai dinilai</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Belum Dinilai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSiswa - siswaWithScores}</div>
              <p className="text-xs text-muted-foreground">Perlu penilaian</p>
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
        <div>
          <h2 className="text-lg font-medium mb-4">Hasil Siswa</h2>
          
          {siswaResults.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada siswa yang mengerjakan ujian ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {siswaResults.map((siswaResult) => (
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
