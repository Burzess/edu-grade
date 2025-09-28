"use client"

import { useState } from 'react'
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
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// Component untuk text yang dapat diperluas
function ExpandableText({ 
  text, 
  maxLength = 200, 
  className = "" 
}: { 
  text: string
  maxLength?: number
  className?: string 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (!text || text.length <= maxLength) {
    return <div className={className}>{text}</div>
  }
  
  const displayText = isExpanded ? text : `${text.slice(0, maxLength)}...`
  
  return (
    <div className={className}>
      <div className="whitespace-pre-wrap transition-all duration-200 ease-in-out">
        {displayText}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 p-0 h-auto text-xs font-medium text-primary hover:text-primary/80 hover:bg-transparent transition-colors duration-150"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Tampilkan lebih sedikit
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Tampilkan selengkapnya
          </>
        )}
      </Button>
    </div>
  )
}

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
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="font-medium text-sm text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Informasi:
            </div>
            <div className="text-orange-800 dark:text-orange-200 text-sm">
              Data soal tidak tersedia (ID: {jawaban.soal_id || 'unknown'}).
              <br />
              Kemungkinan soal telah dihapus atau ada masalah dengan database.
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="font-medium text-sm text-blue-600 dark:text-blue-300 mb-2">Jawaban Anda:</div>
            <ExpandableText 
              text={jawaban.answer_text || 'Tidak ada jawaban'} 
              maxLength={200}
              className="text-blue-800 dark:text-blue-200"
            />
          </div>

          {hasScore && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm text-muted-foreground mb-2">Skor:</div>
              <div className="text-foreground">
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
                className={jawaban.score >= 70 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-red-600 hover:bg-red-700 text-white"
                }
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
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="font-medium text-sm text-muted-foreground mb-2">Pertanyaan:</div>
          <ExpandableText 
            text={jawaban.soal?.question_text || 'Soal tidak tersedia'} 
            maxLength={300}
            className="text-foreground"
          />
        </div>

        {/* Answer */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="font-medium text-sm text-blue-600 dark:text-blue-300 mb-2">Jawaban Anda:</div>
          {jawaban.soal?.question_type === 'multiple_choice' ? (
            <div className="text-blue-800 dark:text-blue-200">
              <div className="font-medium">
                {(() => {
                  // Simplified approach - get answer text
                  let answerText = jawaban.answer_text;
                  
                  if (jawaban.soal.options && Array.isArray(jawaban.soal.options)) {
                    for (const opt of jawaban.soal.options) {
                      if (opt.id === jawaban.answer_text) {
                        answerText = opt.text;
                        break;
                      }
                    }
                  }
                  
                  return `${jawaban.answer_text}. ${answerText}`;
                })()}
              </div>
              {/* Status jawaban */}
              {jawaban.soal.correct_answer && (
                <div className={`text-xs mt-2 px-2 py-1 rounded inline-block ${
                  jawaban.answer_text === jawaban.soal.correct_answer 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {jawaban.answer_text === jawaban.soal.correct_answer ? '✓ Benar' : '✗ Salah'}
                </div>
              )}
            </div>
          ) : (
            <ExpandableText 
              text={jawaban.answer_text || 'Tidak ada jawaban'} 
              maxLength={200}
              className="text-blue-800 dark:text-blue-200"
            />
          )}
        </div>

        {/* Correct Answer (for multiple choice when answer is wrong) */}
        {jawaban.soal && 
         jawaban.soal.question_type === 'multiple_choice' && 
         jawaban.soal.correct_answer && 
         jawaban.answer_text !== jawaban.soal.correct_answer && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="font-medium text-sm text-green-600 dark:text-green-300 mb-2">Jawaban yang Benar:</div>
            <div className="text-green-800 dark:text-green-200 font-medium">
              {(() => {
                // Simplified approach - get correct answer text
                let correctText = 'Teks tidak tersedia';
                
                if (jawaban.soal.options && Array.isArray(jawaban.soal.options)) {
                  for (const opt of jawaban.soal.options) {
                    if (opt.id === jawaban.soal.correct_answer) {
                      correctText = opt.text;
                      break;
                    }
                  }
                }
                
                return `${jawaban.soal.correct_answer}. ${correctText}`;
              })()}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        {hasFeedback && (
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="font-medium text-sm text-purple-600 dark:text-purple-300 mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback:
            </div>
            <ExpandableText 
              text={jawaban.ai_feedback} 
              maxLength={250}
              className="text-purple-800 dark:text-purple-200"
            />
          </div>
        )}

        {/* Status */}
        <div className="text-xs text-muted-foreground">
          {hasScore ? (
            <span>
              {jawaban.soal?.question_type === 'multiple_choice' 
                ? 'Dinilai otomatis oleh sistem (instant)' 
                : 'Dinilai otomatis oleh AI (batch processing)'
              }
            </span>
          ) : (
            <span>
              {jawaban.soal?.question_type === 'multiple_choice'
                ? 'Menunggu penilaian otomatis...'
                : 'Sedang dalam proses penilaian AI batch'
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
    <div className="container mx-auto px-4 md:px-8 py-6 space-y-8">
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
              className={
                averageScore !== null && averageScore >= 70 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800" 
                  : averageScore !== null 
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300"
              }
            >
              {averageScore !== null ? `${averageScore}/100` : 'Belum Dinilai'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalQuestions}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Soal</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{answeredQuestions}</div>
              <div className="text-sm text-green-600 dark:text-green-400">Dijawab</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {averageScore !== null ? averageScore : '-'}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Rata-rata Nilai</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{correctAnswers}</div>
              <div className="text-sm text-orange-600 dark:text-orange-400">Benar (≥70)</div>
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
            // Sort by question type first (multiple_choice first, then essay), then by order
            const aType = a.soal?.question_type || 'essay'
            const bType = b.soal?.question_type || 'essay'
            
            // Multiple choice comes first
            if (aType === 'multiple_choice' && bType === 'essay') return -1
            if (aType === 'essay' && bType === 'multiple_choice') return 1
            
            // If same type, sort by question order
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
