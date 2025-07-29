"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUjianForSiswa, useJawabanByUjian, useSubmitJawaban } from '@/hooks/use-jawaban'
import { SiswaOnlyGuard } from '@/components/auth/role-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
    Clock,
    FileText,
    CheckCircle,
    AlertCircle,
    User,
    ArrowLeft,
    ArrowRight,
    Save,
    Send
} from 'lucide-react'
import { formatDistanceToNow, format, isAfter } from 'date-fns'
import { id } from 'date-fns/locale'

interface QuestionCardProps {
    soal: any
    index: number
    total: number
    answer: string
    onAnswerChange: (answer: string) => void
    onNext: () => void
    onPrev: () => void
    onSubmit: () => void
    isLast: boolean
    isFirst: boolean
    isSaving: boolean
}

function QuestionCard({
    soal,
    index,
    total,
    answer,
    onAnswerChange,
    onNext,
    onPrev,
    onSubmit,
    isLast,
    isFirst,
    isSaving
}: QuestionCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">
                            Soal {index + 1} dari {total}
                        </CardTitle>
                        <CardDescription>
                            {soal.question_type === 'essay' ? 'Pertanyaan Essay' : 'Pilihan Ganda'}
                        </CardDescription>
                    </div>
                    <Progress value={((index + 1) / total) * 100} className="w-24" />
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Question */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium mb-2">Pertanyaan:</div>
                    <div className="text-gray-700 whitespace-pre-wrap">
                        {soal.question_text}
                    </div>

                    {/* Tags if available */}
                    {soal.tags && soal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                            {soal.tags.map((tag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Answer Input */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Jawaban Anda:</label>
                    {soal.question_type === 'essay' ? (
                        <Textarea
                            placeholder="Tulis jawaban Anda di sini..."
                            value={answer}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            rows={8}
                        />
                    ) : (
                        // Multiple choice options
                        <div className="space-y-2">
                            {soal.options?.map((option: any) => (
                                <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`question-${soal.id}`}
                                        value={option.id}
                                        checked={answer === option.id}
                                        onChange={(e) => onAnswerChange(e.target.value)}
                                        className="radio"
                                    />
                                    <span>{option.text}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isFirst || isSaving}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Sebelumnya
                    </Button>

                    <div className="text-sm text-muted-foreground flex flex-col items-center gap-1">
                        {/* Answer status */}
                        {answer.trim() ? (
                            <span className="text-green-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                Dijawab
                            </span>
                        ) : (
                            <span className="text-orange-600 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                Belum dijawab
                            </span>
                        )}
                    </div>

                    {isLast ? (
                        <Button onClick={onSubmit} disabled={isSaving}>
                            <Send className="h-4 w-4 mr-2" />
                            {isSaving ? 'Menyimpan...' : 'Selesai'}
                        </Button>
                    ) : (
                        <Button onClick={onNext} disabled={isSaving}>
                            Selanjutnya
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function UjianSiswaPageContent() {
    const params = useParams()
    const router = useRouter()
    const ujianId = params.id as string

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [showSubmitDialog, setShowSubmitDialog] = useState(false)

    const { data: ujian, isLoading: ujianLoading } = useUjianForSiswa(ujianId)
    const { data: existingAnswers = [] } = useJawabanByUjian(ujianId)
    const submitJawabanMutation = useSubmitJawaban()

    const questions = ujian?.ujian_soal?.sort((a: any, b: any) => a.urutan - b.urutan) || []
    const currentQuestion = questions[currentQuestionIndex]
    const memoizedQuestions = useMemo(() => questions, [questions]);

    const handleSubmitAll = useCallback(async (isAutoSubmit = false) => {
        try {
            if (!memoizedQuestions || memoizedQuestions.length === 0) {
                toast.error('Tidak ada soal untuk dikumpulkan');
                return;
            }

            const unansweredQuestions = memoizedQuestions.filter((q: any) =>
                q?.soal?.id && (!answers[q.soal.id] || answers[q.soal.id].trim() === '')
            );

            if (!isAutoSubmit && unansweredQuestions.length > 0) {
                const confirmSubmit = window.confirm(
                    `Masih ada ${unansweredQuestions.length} soal yang belum dijawab. Yakin ingin mengumpulkan?`
                );
                if (!confirmSubmit) return;
            }

            console.log('📤 Final submit - saving all answers...', {
                isAutoSubmit,
                totalQuestions: memoizedQuestions.length,
                answeredQuestions: memoizedQuestions.length - unansweredQuestions.length,
                unansweredQuestions: unansweredQuestions.length
            });

            const submissions = memoizedQuestions
                .filter((q: any) => q?.soal?.id)
                .map((q: any) => ({
                    ujian_id: ujianId,
                    soal_id: q.soal.id,
                    answer_text: answers[q.soal.id] || ''
                }));

            if (submissions.length === 0) {
                toast.error('Tidak ada jawaban valid untuk dikumpulkan');
                return;
            }

            await Promise.all(
                submissions.map((submission: any) =>
                    submitJawabanMutation.mutateAsync(submission)
                )
            );

            localStorage.removeItem(`ujian_${ujianId}_answers`);

            toast.success(
                isAutoSubmit
                    ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                    : 'Ujian berhasil dikumpulkan!'
            );

            setTimeout(() => {
                router.push('/siswa/dashboard');
            }, isAutoSubmit ? 2000 : 1000);

        } catch (error) {
            console.error('Error submitting ujian:', error);
            toast.error(
                isAutoSubmit
                    ? 'Gagal mengumpulkan ujian otomatis. Silakan coba manual.'
                    : 'Gagal mengumpulkan ujian'
            );
        }
    }, [memoizedQuestions, answers, submitJawabanMutation, ujianId, router]);

    // Load existing answers
    useEffect(() => {
        if (existingAnswers.length > 0) {
            const answerMap: { [key: string]: string } = {}
            existingAnswers.forEach((answer: any) => {
                answerMap[answer.soal_id] = answer.answer_text
            })
            setAnswers(answerMap)
        }

        // Load from localStorage sebagai backup
        const localKey = `ujian_${ujianId}_answers`
        const localAnswers = localStorage.getItem(localKey)
        if (localAnswers) {
            try {
                const parsedAnswers = JSON.parse(localAnswers)
                setAnswers(prev => ({ ...prev, ...parsedAnswers }))
            } catch (error) {
                console.error('Error parsing local answers:', error)
            }
        }
    }, [existingAnswers, ujianId])

    // Timer logic
    useEffect(() => {
        if (!ujian?.start_time || !ujian?.duration_minutes) return

        const startTime = new Date(ujian.start_time)
        const endTime = new Date(startTime.getTime() + ujian.duration_minutes * 60 * 1000)
        let hasAutoSubmitted = false // Prevent double submission

        const updateTimer = () => {
            const now = new Date()
            const remaining = Math.max(0, endTime.getTime() - now.getTime())
            const remainingSeconds = Math.floor(remaining / 1000)

            setTimeLeft(remainingSeconds)

            console.log('⏰ Timer update:', {
                remaining: remainingSeconds,
                hasAutoSubmitted,
                endTime: endTime.toISOString(),
                now: now.toISOString()
            })

            // Auto submit ketika waktu habis (with safeguards)
            if (remainingSeconds <= 0 && !hasAutoSubmitted) {
                hasAutoSubmitted = true
                console.log('⏰ Time is up! Auto-submitting ujian...')

                // Show warning to user
                toast.warning('Waktu ujian habis! Otomatis mengumpulkan jawaban...', {
                    duration: 3000
                })

                // Auto submit with slight delay to ensure user sees the message
                setTimeout(() => {
                    handleSubmitAll(true) // Pass true for isAutoSubmit
                }, 1000)

                return // Stop further timer updates
            }

            // Warning ketika 5 menit tersisa
            if (remainingSeconds > 0 && remainingSeconds <= 300 && remainingSeconds % 60 === 0) {
                const minutesLeft = Math.floor(remainingSeconds / 60)
                toast.warning(`⚠️ Sisa waktu: ${minutesLeft} menit!`, {
                    duration: 2000
                })
            }

            // Warning ketika 1 menit tersisa (setiap 10 detik)
            if (remainingSeconds > 0 && remainingSeconds <= 60 && remainingSeconds % 10 === 0) {
                toast.error(`⏰ Sisa waktu: ${remainingSeconds} detik!`, {
                    duration: 1000
                })
            }
        }

        // Initial timer update
        updateTimer()

        // Set interval untuk update setiap detik
        const interval = setInterval(updateTimer, 1000)

        return () => {
            console.log('🧹 Cleaning up timer interval')
            clearInterval(interval)
        }
    }, [ujian, handleSubmitAll])

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`
    }

    const handleAnswerChange = (answer: string) => {
        if (!currentQuestion?.soal?.id) {
            console.error('❌ No current question or soal ID available')
            return
        }

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.soal.id]: answer
        }))

        // Simpan ke localStorage untuk backup (tidak ke database)
        const localKey = `ujian_${ujianId}_answers`
        const currentAnswers = {
            ...answers,
            [currentQuestion.soal.id]: answer
        }
        localStorage.setItem(localKey, JSON.stringify(currentAnswers))

        console.log('💭 Answer saved locally for soal:', currentQuestion.soal.id)
    }

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }

    if (ujianLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <div className="flex justify-between">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!ujian) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ujian Tidak Ditemukan</h3>
                    <p className="text-muted-foreground mb-4">
                        Ujian yang Anda cari tidak tersedia atau sudah berakhir.
                    </p>
                    <Button asChild>
                        <span onClick={() => router.push('/siswa/dashboard')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali ke Dashboard
                        </span>
                    </Button>
                </div>
            </div>
        )
    }

    // Check if exam has ended
    if (ujian.end_time && isAfter(new Date(), new Date(ujian.end_time))) {
        return (
            <div className="container mx-auto py-6">
                <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Ujian Telah Berakhir</h3>
                    <p className="text-muted-foreground mb-4">
                        Waktu ujian telah habis pada {format(new Date(ujian.end_time), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </p>
                    <Button asChild>
                        <span onClick={() => router.push('/siswa/dashboard')}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Kembali ke Dashboard
                        </span>
                    </Button>
                </div>
            </div>
        )
    }

    const answeredCount = questions
        .filter((q: any) => q?.soal?.id && answers[q.soal.id]?.trim())
        .length

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with timer */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">{ujian.name}</h1>
                            <p className="text-sm text-muted-foreground">
                                Guru: {ujian.profiles?.full_name}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Progress */}
                            <div className="text-sm">
                                <span className="font-medium">{answeredCount}</span>
                                <span className="text-muted-foreground"> / {questions.length} dijawab</span>
                            </div>

                            {/* Timer */}
                            {timeLeft !== null && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${timeLeft < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    <Clock className="h-4 w-4" />
                                    <span className="font-mono font-bold">
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                onClick={() => setShowSubmitDialog(true)}
                                disabled={submitJawabanMutation.isPending}
                            >
                                <Send className="h-4 w-4 mr-2" />
                                Kumpulkan
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto py-6">
                {questions.length > 0 && currentQuestion?.soal ? (
                    <QuestionCard
                        soal={currentQuestion.soal}
                        index={currentQuestionIndex}
                        total={questions.length}
                        answer={answers[currentQuestion.soal.id] || ''}
                        onAnswerChange={handleAnswerChange}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onSubmit={() => setShowSubmitDialog(true)}
                        isLast={currentQuestionIndex === questions.length - 1}
                        isFirst={currentQuestionIndex === 0}
                        isSaving={submitJawabanMutation.isPending}
                    />
                ) : (
                    <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Tidak Ada Soal</h3>
                        <p className="text-muted-foreground">
                            Ujian ini belum memiliki soal yang bisa dikerjakan.
                        </p>
                    </div>
                )}
            </div>

            {/* Submit confirmation dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kumpulkan Ujian</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin mengumpulkan ujian?
                            <br />
                            <br />
                            <strong>Progress:</strong> {answeredCount} dari {questions.length} soal dijawab
                            <br />
                            Setelah dikumpulkan, Anda tidak bisa mengubah jawaban lagi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleSubmitAll(false)} // Pass false for manual submit
                            disabled={submitJawabanMutation.isPending}
                        >
                            {submitJawabanMutation.isPending ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function UjianSiswaPage() {
    return (
        <SiswaOnlyGuard>
            <UjianSiswaPageContent />
        </SiswaOnlyGuard>
    )
}
