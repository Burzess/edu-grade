"use client"

import { useParams, useRouter } from 'next/navigation'
import { useJawabanByUjian, useUjianForSiswa } from '@/hooks/use-jawaban'
import { SiswaOnlyGuard } from '@/components/auth/role-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft,
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

function ResultCard({ jawaban, index }: { jawaban: any, index: number }) {
  const hasScore = jawaban.score !== null
  const hasFeedback = jawaban.ai_feedback && jawaban.ai_feedback.trim() !== ''
  
  // Safety check for jawaban.soal
  if (!jawaban.soal) {
    return (
      <Card className="mb-4 border-orange-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Soal {index + 1}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Data Tidak Lengkap
              </Badge>
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="font-medium text-sm text-orange-700 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Informasi:
            </div>
            <div className="text-orange-800 text-sm">
              Data soal tidak tersedia (ID: {jawaban.soal_id || 'unknown'}).
              <br />
              Kemungkinan soal telah dihapus atau ada masalah dengan database.
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="font-medium text-sm text-blue-600 mb-2">Jawaban Anda:</div>
            <div className="text-blue-800 whitespace-pre-wrap">
              {jawaban.answer_text || 'Tidak ada jawaban'}
            </div>
          </div>

          {hasScore && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium text-sm text-gray-600 mb-2">Skor:</div>
              <div className="text-gray-800">
                {jawaban.score}/100
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Soal {index + 1}</CardTitle>
          <div className="flex items-center gap-2">
            {hasScore && (
              <Badge 
                variant={jawaban.score >= 70 ? "default" : "secondary"}
                className={jawaban.score >= 70 ? "bg-green-600" : "bg-red-600"}
              >
                {jawaban.score}/100
              </Badge>
            )}
            {hasScore ? (
              jawaban.score >= 70 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )
            ) : (
              <Clock className="h-5 w-5 text-orange-500" />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Question */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="font-medium text-sm text-gray-600 mb-2">Pertanyaan:</div>
          <div className="text-gray-800 whitespace-pre-wrap">
            {jawaban.soal?.question_text || 'Soal tidak tersedia'}
          </div>
        </div>

        {/* Answer */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="font-medium text-sm text-blue-600 mb-2">Jawaban Anda:</div>
          <div className="text-blue-800 whitespace-pre-wrap">
            {jawaban.answer_text || 'Tidak ada jawaban'}
          </div>
        </div>

        {/* Correct Answer (for multiple choice) */}
        {jawaban.soal && jawaban.soal.question_type === 'multiple_choice' && jawaban.soal.correct_answer && (
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="font-medium text-sm text-green-600 mb-2">Jawaban Benar:</div>
            <div className="text-green-800">
              {jawaban.soal.options?.find((opt: any) => opt.id === jawaban.soal.correct_answer)?.text || 'Tidak tersedia'}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        {hasFeedback && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="font-medium text-sm text-purple-600 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback AI:
            </div>
            <div className="text-purple-800 whitespace-pre-wrap">
              {jawaban.ai_feedback}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-muted-foreground">
          {hasScore ? (
            <span>
              {jawaban.soal?.question_type === 'multiple_choice' 
                ? 'Dinilai otomatis oleh sistem' 
                : 'Dinilai otomatis oleh AI'
              }
            </span>
          ) : (
            <span>
              {jawaban.soal?.question_type === 'multiple_choice'
                ? 'Menunggu penilaian otomatis...'
                : 'Sedang dalam proses penilaian AI'
              }
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function HasilUjianPageContent() {
  const params = useParams()
  const router = useRouter()
  const ujianId = params.id as string

  const { data: ujian, isLoading: ujianLoading } = useUjianForSiswa(ujianId)
  const { data: jawaban = [], isLoading: jawabanLoading } = useJawabanByUjian(ujianId)

  const isLoading = ujianLoading || jawabanLoading

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>

        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!ujian || jawaban.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {!ujian ? 'Ujian Tidak Ditemukan' : 'Belum Ada Hasil'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {!ujian 
              ? 'Ujian yang Anda cari tidak tersedia.' 
              : 'Anda belum mengerjakan ujian ini atau hasil belum tersedia.'
            }
          </p>
          <Button onClick={() => router.push('/siswa/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalQuestions = jawaban.length
  const scoredAnswers = jawaban.filter(j => j.score !== null)
  const averageScore = scoredAnswers.length > 0 
    ? Math.round(scoredAnswers.reduce((sum, j) => sum + j.score, 0) / scoredAnswers.length)
    : null
  const correctAnswers = scoredAnswers.filter(j => j.score >= 70).length
  const answeredQuestions = jawaban.filter(j => j.answer_text && j.answer_text.trim() !== '').length

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => router.push('/siswa/dashboard')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali ke Dashboard
      </Button>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{ujian.name}</CardTitle>
              <CardDescription className="text-base mt-1">
                {ujian.description || 'Tidak ada deskripsi'}
              </CardDescription>
            </div>
            <Badge 
              variant="secondary" 
              className={averageScore !== null && averageScore >= 70 
                ? "bg-green-100 text-green-800" 
                : averageScore !== null 
                ? "bg-red-100 text-red-800"
                : "bg-gray-100 text-gray-800"
              }
            >
              {averageScore !== null ? `${averageScore}/100` : 'Belum Dinilai'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
              <div className="text-sm text-blue-600">Total Soal</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{answeredQuestions}</div>
              <div className="text-sm text-green-600">Dijawab</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {averageScore !== null ? averageScore : '-'}
              </div>
              <div className="text-sm text-purple-600">Rata-rata Nilai</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{correctAnswers}</div>
              <div className="text-sm text-orange-600">Benar (≥70)</div>
            </div>
          </div>

          {/* Exam info */}
          <div className="mt-6 pt-4 border-t space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Guru: {ujian.profiles?.full_name}</span>
            </div>
            {jawaban[0]?.created_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Dikerjakan: {format(new Date(jawaban[0].created_at), 'dd MMM yyyy, HH:mm', { locale: id })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Detail Jawaban</h2>
        
        {jawaban
          .sort((a, b) => {
            // Sort by question order if available, otherwise by creation time
            if (!ujian.ujian_soal) return 0;
            const aOrder = ujian.ujian_soal.find((us: any) => us.soal_id === a.soal_id)?.urutan || 0
            const bOrder = ujian.ujian_soal.find((us: any) => us.soal_id === b.soal_id)?.urutan || 0
            return aOrder - bOrder
          })
          .map((jawaban, index) => (
            <ResultCard 
              key={jawaban.id} 
              jawaban={jawaban} 
              index={index}
            />
          ))
        }
      </div>

      {/* Summary */}
      {averageScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ringkasan Hasil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              {averageScore >= 70 ? (
                <div className="text-green-600">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Selamat! Anda Lulus</div>
                  <div className="text-sm">Nilai Anda: {averageScore}/100</div>
                </div>
              ) : (
                <div className="text-red-600">
                  <XCircle className="h-12 w-12 mx-auto mb-2" />
                  <div className="text-lg font-semibold">Perlu Perbaikan</div>
                  <div className="text-sm">Nilai Anda: {averageScore}/100</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function HasilUjianPage() {
  return (
    <SiswaOnlyGuard>
      <HasilUjianPageContent />
    </SiswaOnlyGuard>
  )
}
