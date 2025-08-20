"use client"

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUjianForSiswa, useJawabanByUjian, useSubmitJawaban } from '@/hooks/use-jawaban'
import { useStartUjianSiswa, useSubmitUjianSiswa } from '@/hooks/use-ujian'
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
    Send,
    Grid3X3,
    Play
} from 'lucide-react'
import { formatDistanceToNow, format, isAfter } from 'date-fns'
import { id } from 'date-fns/locale'

// Fungsi untuk mengacak array (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
}

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
    sectionType: 'multiple_choice' | 'essay'
    sectionIndex: number
    sectionTotal: number
}

const QuestionCard = memo(({
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
    isSaving,
    sectionType,
    sectionIndex,
    sectionTotal
}: QuestionCardProps) => {
    return (
        <Card className="w-full max-w-none sm:max-w-4xl mx-auto shadow-sm">
            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl lg:text-2xl flex items-center gap-2">
                            {sectionType === 'multiple_choice' ? '📝' : '✍️'}
                            <span>{sectionType === 'multiple_choice' ? 'PILIHAN GANDA' : 'ESSAY'}</span>
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base mt-1">
                            Soal {sectionIndex + 1} dari {sectionTotal} ({sectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'})
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 sm:text-right">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                            Progress: {index + 1}/{total}
                        </div>
                        <Progress value={((index + 1) / total) * 100} className="w-20 sm:w-24 lg:w-32" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                {/* Question */}
                <div className="p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
                    <div className="font-semibold mb-2 sm:mb-3 text-blue-900 text-sm sm:text-base lg:text-lg">
                        Pertanyaan:
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                        {soal.question_text}
                    </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-3 sm:space-y-4">
                    <label className="text-sm sm:text-base font-semibold text-gray-700">
                        Jawaban Anda:
                    </label>
                    {soal.question_type === 'essay' ? (
                        <Textarea
                            placeholder="Tulis jawaban Anda di sini dengan lengkap dan jelas..."
                            value={answer}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            rows={6}
                            className="min-h-[150px] sm:min-h-[200px] text-sm sm:text-base leading-relaxed resize-none"
                        />
                    ) : (
                        // Multiple choice options
                        <div className="space-y-2 sm:space-y-3">
                            {soal.options?.map((option: any, optIndex: number) => (
                                <label 
                                    key={option.id} 
                                    className={`
                                        flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                        ${answer === option.id 
                                            ? 'border-blue-500 bg-blue-50 shadow-sm' 
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        }
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${soal.id}`}
                                        value={option.id}
                                        checked={answer === option.id}
                                        onChange={(e) => onAnswerChange(e.target.value)}
                                        className="mt-0.5 sm:mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className={`
                                            font-semibold mr-2 text-sm sm:text-base
                                            ${answer === option.id ? 'text-blue-700' : 'text-gray-600'}
                                        `}>
                                            {String.fromCharCode(65 + optIndex)}.
                                        </span>
                                        <span className={`
                                            text-sm sm:text-base leading-relaxed break-words
                                            ${answer === option.id ? 'text-blue-900' : 'text-gray-800'}
                                        `}>
                                            {option.text}
                                        </span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isFirst || isSaving}
                        className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden xs:inline">Sebelumnya</span>
                        <span className="xs:hidden">Prev</span>
                    </Button>

                    <div className="flex flex-col items-center gap-1 text-center px-2">
                        {/* Answer status */}
                        {answer.trim() ? (
                            <div className="flex items-center gap-1 sm:gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs sm:text-sm font-medium">Dijawab</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 sm:gap-2 text-orange-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs sm:text-sm font-medium">Belum dijawab</span>
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                            {sectionIndex + 1}/{sectionTotal}
                        </div>
                    </div>

                    {isLast ? (
                        <Button 
                            onClick={onSubmit} 
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-1 sm:gap-2 px-3 py-2 text-sm"
                        >
                            <Send className="h-4 w-4" />
                            <span className="hidden xs:inline">
                                {isSaving ? 'Menyimpan...' : 'Selesai'}
                            </span>
                            <span className="xs:hidden">
                                {isSaving ? 'Save...' : 'Done'}
                            </span>
                        </Button>
                    ) : (
                        <Button 
                            onClick={onNext} 
                            disabled={isSaving}
                            className="flex items-center gap-1 sm:gap-2 px-3 py-2 text-sm"
                        >
                            <span className="hidden xs:inline">Selanjutnya</span>
                            <span className="xs:hidden">Next</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
})

// Add display name for ESLint
QuestionCard.displayName = 'QuestionCard'

// Component untuk Question Navigator (mobile-friendly)
const QuestionNavigator = memo(({ 
    questions, 
    currentIndex, 
    answers, 
    onQuestionSelect, 
    sectionType,
    isOpen,
    onToggle 
}: {
    questions: any[]
    currentIndex: number
    answers: { [key: string]: string }
    onQuestionSelect: (index: number) => void
    sectionType: 'multiple_choice' | 'essay'
    isOpen: boolean
    onToggle: () => void
}) => {
    return (
        <>
            {/* Mobile Toggle Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="fixed top-16 sm:top-20 right-2 sm:right-4 z-20 lg:hidden shadow-lg p-2"
            >
                <Grid3X3 className="h-4 w-4" />
            </Button>

            {/* Navigator Panel */}
            <div className={`
                fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-30 transition-transform duration-300
                w-72 sm:w-80 lg:w-64
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                lg:translate-x-0 lg:relative lg:shadow-none lg:z-10
            `}>
                <div className="p-3 sm:p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                            {sectionType === 'multiple_choice' ? '📝 PILIHAN GANDA' : '✍️ ESSAY'}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className="lg:hidden p-1"
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {questions.length} soal tersedia
                    </div>
                </div>

                <div className="p-3 sm:p-4 h-full overflow-y-auto pb-20">
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {questions.map((question, index) => {
                            const isAnswered = answers[question.soal?.id]?.trim()
                            const isCurrent = index === currentIndex
                            
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onQuestionSelect(index)
                                        onToggle() // Close on mobile
                                    }}
                                    className={`
                                        w-10 h-10 sm:w-12 sm:h-12 rounded-md border-2 text-sm font-semibold transition-all duration-200 relative
                                        ${isCurrent 
                                            ? 'border-blue-500 bg-blue-500 text-white shadow-md scale-105' 
                                            : isAnswered
                                                ? 'border-green-500 bg-green-100 text-green-800 hover:bg-green-200'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    {index + 1}
                                    {isAnswered && !isCurrent && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="text-xs text-gray-600 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500 rounded border-2 border-blue-500"></div>
                                <span>Soal saat ini</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 rounded border-2 border-green-500 relative">
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <span>Sudah dijawab</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-white rounded border-2 border-gray-300"></div>
                                <span>Belum dijawab</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    )
})

// Add display name for ESLint
QuestionNavigator.displayName = 'QuestionNavigator'

function UjianSiswaPageContent() {
    const params = useParams()
    const router = useRouter()
    const ujianId = params.id as string

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [showSubmitDialog, setShowSubmitDialog] = useState(false)
    const [navigatorOpen, setNavigatorOpen] = useState(false)

    const { data: ujian, isLoading: ujianLoading } = useUjianForSiswa(ujianId)
    const { data: existingAnswers = [] } = useJawabanByUjian(ujianId)
    const submitJawabanMutation = useSubmitJawaban()
    const startUjianSiswaMutation = useStartUjianSiswa()
    const submitUjianSiswaMutation = useSubmitUjianSiswa()

    // Kelompokkan dan acak soal berdasarkan question_type
    const organizedQuestions = useMemo(() => {
        if (!ujian?.ujian_soal?.length) return []

        const sortedUjianSoal = ujian.ujian_soal.sort((a: any, b: any) => a.urutan - b.urutan)
        const validQuestions = sortedUjianSoal.filter((us: any) => us.soal)

        // Kelompokkan soal berdasarkan question_type
        const multipleChoice = validQuestions.filter((us: any) => us.soal.question_type === 'multiple_choice')
        const essay = validQuestions.filter((us: any) => us.soal.question_type === 'essay')

        // Acak soal multiple choice untuk setiap siswa (seed berdasarkan user ID + ujian ID)
        const userId = localStorage.getItem('current_user_id') || Math.random().toString()
        const seed = `${userId}-${ujianId}`
        
        // Simple seeded random function
        const seededRandom = (seed: string) => {
            let hash = 0
            for (let i = 0; i < seed.length; i++) {
                hash = ((hash << 5) - hash + seed.charCodeAt(i)) & 0xffffffff
            }
            return Math.abs(hash) / 2147483647
        }

        const shuffledMC = [...multipleChoice]
        // Fisher-Yates shuffle dengan seeded random
        for (let i = shuffledMC.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(`${seed}-${i}`) * (i + 1));
            [shuffledMC[i], shuffledMC[j]] = [shuffledMC[j], shuffledMC[i]]
        }

        // Gabungkan: multiple choice dulu, kemudian essay (tetap berurutan)
        return [...shuffledMC, ...essay]
    }, [ujian?.ujian_soal, ujianId])

    // Kelompokkan untuk navigator
    const questionSections = useMemo(() => {
        const mcQuestions = organizedQuestions.filter((q: any) => q.soal.question_type === 'multiple_choice')
        const essayQuestions = organizedQuestions.filter((q: any) => q.soal.question_type === 'essay')

        return {
            multipleChoice: mcQuestions,
            essay: essayQuestions,
            all: organizedQuestions
        }
    }, [organizedQuestions])

    const currentQuestion = organizedQuestions[currentQuestionIndex]
    const currentSectionType = currentQuestion?.soal?.question_type || 'multiple_choice'
    
    // Hitung section index dan total untuk navigasi yang tepat
    const { sectionIndex, sectionTotal } = useMemo(() => {
        if (!currentQuestion) return { sectionIndex: 0, sectionTotal: 0 }

        if (currentSectionType === 'multiple_choice') {
            const mcIndex = questionSections.multipleChoice.findIndex((q: any) => q.soal.id === currentQuestion.soal.id)
            return {
                sectionIndex: mcIndex,
                sectionTotal: questionSections.multipleChoice.length
            }
        } else {
            const essayIndex = questionSections.essay.findIndex((q: any) => q.soal.id === currentQuestion.soal.id)
            return {
                sectionIndex: essayIndex,
                sectionTotal: questionSections.essay.length
            }
        }
    }, [currentQuestion, questionSections, currentSectionType])

    const handleSubmitAll = useCallback(async (isAutoSubmit = false) => {
        try {
            if (!organizedQuestions || organizedQuestions.length === 0) {
                toast.error('Tidak ada soal untuk dikumpulkan');
                return;
            }

            const unansweredQuestions = organizedQuestions.filter((q: any) =>
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
                totalQuestions: organizedQuestions.length,
                answeredQuestions: organizedQuestions.length - unansweredQuestions.length,
                unansweredQuestions: unansweredQuestions.length
            });

            const submissions = organizedQuestions
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

            // Update status ujian_siswa menjadi completed
            try {
                await submitUjianSiswaMutation.mutateAsync(ujianId);
                console.log('✅ Status ujian_siswa berhasil diupdate menjadi completed');
            } catch (error) {
                console.error('❌ Error updating ujian_siswa status:', error);
                // Tidak perlu throw error, karena jawaban sudah tersimpan
            }

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
    }, [organizedQuestions, answers, submitJawabanMutation, submitUjianSiswaMutation, ujianId, router]);

    // Auto submit ref untuk timer
    const autoSubmitRef = useRef<(() => void) | null>(null);
    
    useEffect(() => {
        autoSubmitRef.current = () => handleSubmitAll(true);
    }, [handleSubmitAll]);

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

    // Auto register siswa ke ujian_siswa ketika mengakses halaman ujian
    useEffect(() => {
        if (!ujian || !ujianId || ujianLoading) return
        
        // Hanya register jika ujian aktif
        if (ujian.status === 'active') {
            startUjianSiswaMutation.mutate(ujianId, {
                onSuccess: () => {
                    console.log('✅ Siswa berhasil terdaftar untuk ujian:', ujianId)
                },
                onError: (error: any) => {
                    // Jika error karena sudah terdaftar, itu tidak masalah
                    if (error.message.includes('sudah terdaftar')) {
                        console.log('ℹ️ Siswa sudah terdaftar untuk ujian:', ujianId)
                    } else {
                        console.error('❌ Error mendaftarkan siswa:', error)
                        toast.error('Gagal mendaftarkan ke ujian: ' + error.message)
                    }
                }
            })
        }
    }, [ujian, ujianId, ujianLoading, startUjianSiswaMutation])

    // Timer logic
    useEffect(() => {
        if (!ujian?.start_time || !ujian?.duration_minutes) return

        const startTime = new Date(ujian.start_time)
        const endTime = new Date(startTime.getTime() + ujian.duration_minutes * 60 * 1000)
        let hasAutoSubmitted = false

        const updateTimer = () => {
            const now = new Date()
            const remaining = Math.max(0, endTime.getTime() - now.getTime())
            const remainingSeconds = Math.floor(remaining / 1000)

            setTimeLeft(remainingSeconds)

            if (remainingSeconds <= 0 && !hasAutoSubmitted) {
                hasAutoSubmitted = true
                console.log('⏰ Time is up! Auto-submitting ujian...')

                toast.warning('Waktu ujian habis! Otomatis mengumpulkan jawaban...', {
                    duration: 3000
                })

                setTimeout(() => {
                    if (autoSubmitRef.current) {
                        autoSubmitRef.current();
                    }
                }, 1000)

                return
            }

            // Warning notifications
            if (remainingSeconds > 0 && remainingSeconds <= 300 && remainingSeconds % 60 === 0) {
                const minutesLeft = Math.floor(remainingSeconds / 60)
                toast.warning(`⚠️ Sisa waktu: ${minutesLeft} menit!`, {
                    duration: 2000
                })
            }

            if (remainingSeconds > 0 && remainingSeconds <= 60 && remainingSeconds % 10 === 0) {
                toast.error(`⏰ Sisa waktu: ${remainingSeconds} detik!`, {
                    duration: 1000
                })
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => {
            console.log('🧹 Cleaning up timer interval')
            clearInterval(interval)
        }
    }, [ujian?.start_time, ujian?.duration_minutes])

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`
    }, [])

    const handleAnswerChange = useCallback((answer: string) => {
        if (!currentQuestion?.soal?.id) {
            console.error('❌ No current question or soal ID available')
            return
        }

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.soal.id]: answer
        }))

        // Simpan ke localStorage untuk backup
        const localKey = `ujian_${ujianId}_answers`
        setAnswers(currentAnswers => {
            const updatedAnswers = {
                ...currentAnswers,
                [currentQuestion.soal.id]: answer
            }
            localStorage.setItem(localKey, JSON.stringify(updatedAnswers))
            return updatedAnswers
        })

        console.log('Answer saved locally for soal:', currentQuestion.soal.id)
    }, [currentQuestion?.soal?.id, ujianId])

    const handleNext = useCallback(() => {
        if (currentQuestionIndex < organizedQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
        }
    }, [currentQuestionIndex, organizedQuestions.length])

    const handlePrev = useCallback(() => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1)
        }
    }, [currentQuestionIndex])

    const handleSwitchToSection = useCallback((targetSectionType: 'multiple_choice' | 'essay') => {
        // Jangan lakukan apa-apa jika sudah di section yang sama
        if (currentSectionType === targetSectionType) return
        
        // Cari soal pertama dari section target
        const targetQuestions = targetSectionType === 'multiple_choice' 
            ? questionSections.multipleChoice 
            : questionSections.essay
            
        if (targetQuestions.length > 0) {
            // Cari index global dari soal pertama di section target
            const globalIndex = organizedQuestions.findIndex(
                (q: any) => q.soal.id === targetQuestions[0].soal.id
            )
            if (globalIndex !== -1) {
                setCurrentQuestionIndex(globalIndex)
                
                // Berikan feedback toast
                const sectionName = targetSectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'
                toast.success(`Beralih ke section ${sectionName}`, {
                    duration: 1500
                })
            }
        }
    }, [questionSections, organizedQuestions, currentSectionType])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            // Hanya aktif jika tidak sedang focus pada input/textarea
            if (event.target instanceof HTMLInputElement || 
                event.target instanceof HTMLTextAreaElement) {
                return
            }

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault()
                    handlePrev()
                    break
                case 'ArrowRight':
                    event.preventDefault()
                    handleNext()
                    break
                case '1':
                    event.preventDefault()
                    handleSwitchToSection('multiple_choice')
                    break
                case '2':
                    event.preventDefault()
                    handleSwitchToSection('essay')
                    break
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [handleNext, handlePrev, handleSwitchToSection])

    const handleQuestionSelect = useCallback((index: number) => {
        setCurrentQuestionIndex(index)
    }, [])

    const handleShowSubmitDialog = useCallback(() => {
        setShowSubmitDialog(true)
    }, [])

    const answeredCount = useMemo(() => 
        organizedQuestions
            .filter((q: any) => q?.soal?.id && answers[q.soal.id]?.trim())
            .length,
        [organizedQuestions, answers]
    )

    // Progress untuk setiap section
    const sectionProgress = useMemo(() => {
        const mcAnswered = questionSections.multipleChoice.filter((q: any) => answers[q.soal?.id]?.trim()).length
        const essayAnswered = questionSections.essay.filter((q: any) => answers[q.soal?.id]?.trim()).length

        return {
            multipleChoice: {
                answered: mcAnswered,
                total: questionSections.multipleChoice.length,
                percentage: questionSections.multipleChoice.length > 0 ? (mcAnswered / questionSections.multipleChoice.length) * 100 : 0
            },
            essay: {
                answered: essayAnswered,
                total: questionSections.essay.length,
                percentage: questionSections.essay.length > 0 ? (essayAnswered / questionSections.essay.length) * 100 : 0
            }
        }
    }, [questionSections, answers])

    // Render conditions after all hooks are called
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with timer */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base sm:text-lg lg:text-xl font-semibold truncate">{ujian.name}</h1>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                Guru: {ujian.profiles?.full_name}
                            </p>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-shrink-0">
                            {/* Progress - Hidden on very small screens */}
                            <div className="hidden xs:block text-xs sm:text-sm text-center">
                                <div className="font-medium">{answeredCount}/{organizedQuestions.length}</div>
                                <div className="text-muted-foreground">dijawab</div>
                            </div>

                            {/* Timer */}
                            {timeLeft !== null && (
                                <div className={`
                                    flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold
                                    ${timeLeft < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}
                                `}>
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="font-mono text-xs sm:text-sm">
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShowSubmitDialog}
                                disabled={submitJawabanMutation.isPending}
                                className="text-xs px-2 py-1 sm:px-3 sm:py-2 h-8 sm:h-9"
                            >
                                <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                <span className="hidden sm:inline">Kumpulkan</span>
                                <span className="sm:hidden">Submit</span>
                            </Button>
                        </div>
                    </div>
                    
                    {/* Progress bar for very small screens */}
                    <div className="xs:hidden mt-2 flex items-center gap-2 text-xs">
                        <span>{answeredCount}/{organizedQuestions.length} dijawab</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${(answeredCount / Math.max(organizedQuestions.length, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Keyboard shortcuts info - only for large screens */}
                    <div className="hidden xl:block absolute top-2 right-2 text-xs text-muted-foreground text-right">
                        <div>⌨️ Shortcut: ← → Navigasi | 1 PG | 2 Essay</div>
                    </div>
                </div>
            </div>

            {/* Section Progress Tabs */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                    <div className="flex gap-2 sm:gap-4 lg:gap-8 overflow-x-auto scrollbar-hide">
                        {questionSections.multipleChoice.length > 0 && (
                            <button
                                onClick={() => handleSwitchToSection('multiple_choice')}
                                className={`
                                    flex-shrink-0 py-2 sm:py-3 lg:py-4 px-2 sm:px-3 border-b-2 transition-all duration-200 
                                    ${currentSectionType === 'multiple_choice' 
                                        ? 'border-blue-600 text-blue-600 bg-blue-50' 
                                        : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-25'
                                    }
                                `}
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <span className="text-xs sm:text-sm lg:text-base font-medium">📝</span>
                                        <span className="text-xs sm:text-sm lg:text-base font-medium">PG</span>
                                        <Badge 
                                            variant={currentSectionType === 'multiple_choice' ? 'default' : 'secondary'}
                                            className="text-xs px-1 py-0"
                                        >
                                            {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total}
                                        </Badge>
                                    </div>
                                    {currentSectionType !== 'multiple_choice' && (
                                        <span className="text-xs text-gray-400 hidden sm:inline">↗ Klik</span>
                                    )}
                                </div>
                                <div className="w-16 sm:w-20 lg:w-24 bg-gray-200 rounded-full h-1 mt-1">
                                    <div 
                                        className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                                        style={{ width: `${sectionProgress.multipleChoice.percentage}%` }}
                                    />
                                </div>
                            </button>
                        )}

                        {questionSections.essay.length > 0 && (
                            <button
                                onClick={() => handleSwitchToSection('essay')}
                                className={`
                                    flex-shrink-0 py-2 sm:py-3 lg:py-4 px-2 sm:px-3 border-b-2 transition-all duration-200 
                                    ${currentSectionType === 'essay' 
                                        ? 'border-green-600 text-green-600 bg-green-50' 
                                        : 'border-transparent text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-25'
                                    }
                                `}
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <span className="text-xs sm:text-sm lg:text-base font-medium">✍️</span>
                                        <span className="text-xs sm:text-sm lg:text-base font-medium">Essay</span>
                                        <Badge 
                                            variant={currentSectionType === 'essay' ? 'default' : 'secondary'}
                                            className="text-xs px-1 py-0 bg-green-100 text-green-800"
                                        >
                                            {sectionProgress.essay.answered}/{sectionProgress.essay.total}
                                        </Badge>
                                    </div>
                                    {currentSectionType !== 'essay' && (
                                        <span className="text-xs text-gray-400 hidden sm:inline">↗ Klik</span>
                                    )}
                                </div>
                                <div className="w-16 sm:w-20 lg:w-24 bg-gray-200 rounded-full h-1 mt-1">
                                    <div 
                                        className="bg-green-600 h-1 rounded-full transition-all duration-300" 
                                        style={{ width: `${sectionProgress.essay.percentage}%` }}
                                    />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content with sidebar layout */}
            <div className="flex flex-col lg:flex-row">
                {/* Main Question Area */}
                <div className="flex-1 p-3 sm:p-4 lg:p-6 lg:pr-0 min-h-screen">
                    {organizedQuestions.length > 0 && currentQuestion?.soal ? (
                        <QuestionCard
                            soal={currentQuestion.soal}
                            index={currentQuestionIndex}
                            total={organizedQuestions.length}
                            answer={answers[currentQuestion.soal.id] || ''}
                            onAnswerChange={handleAnswerChange}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            onSubmit={handleShowSubmitDialog}
                            isLast={currentQuestionIndex === organizedQuestions.length - 1}
                            isFirst={currentQuestionIndex === 0}
                            isSaving={submitJawabanMutation.isPending}
                            sectionType={currentSectionType}
                            sectionIndex={sectionIndex}
                            sectionTotal={sectionTotal}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
                            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Tidak Ada Soal</h3>
                            <p className="text-muted-foreground text-sm sm:text-base">
                                Ujian ini belum memiliki soal yang bisa dikerjakan. Silakan hubungi guru Anda.
                            </p>
                        </div>
                    )}
                </div>

                {/* Question Navigator Sidebar */}
                {organizedQuestions.length > 0 && (
                    <div className="lg:w-64 lg:flex-shrink-0">
                        <QuestionNavigator
                            questions={currentSectionType === 'multiple_choice' ? questionSections.multipleChoice : questionSections.essay}
                            currentIndex={currentSectionType === 'multiple_choice' 
                                ? sectionIndex
                                : sectionIndex
                            }
                            answers={answers}
                            onQuestionSelect={(sectionIdx) => {
                                // Convert section index to global index
                                if (currentSectionType === 'multiple_choice') {
                                    const globalIndex = organizedQuestions.findIndex(
                                        (q: any) => q.soal.id === questionSections.multipleChoice[sectionIdx]?.soal?.id
                                    )
                                    if (globalIndex !== -1) setCurrentQuestionIndex(globalIndex)
                                } else {
                                    const globalIndex = organizedQuestions.findIndex(
                                        (q: any) => q.soal.id === questionSections.essay[sectionIdx]?.soal?.id
                                    )
                                    if (globalIndex !== -1) setCurrentQuestionIndex(globalIndex)
                                }
                            }}
                            sectionType={currentSectionType}
                            isOpen={navigatorOpen}
                            onToggle={() => setNavigatorOpen(!navigatorOpen)}
                        />
                    </div>
                )}
            </div>

            {/* Submit confirmation dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kumpulkan Ujian</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>Apakah Anda yakin ingin mengumpulkan ujian?</p>
                            
                            <div className="bg-blue-50 p-3 rounded-lg text-sm">
                                <div className="font-medium mb-2">📊 Progress Anda:</div>
                                <div className="space-y-1">
                                    <div>📝 Pilihan Ganda: {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total} soal</div>
                                    <div>✍️ Essay: {sectionProgress.essay.answered}/{sectionProgress.essay.total} soal</div>
                                    <div className="font-medium">Total: {answeredCount}/{organizedQuestions.length} soal dijawab</div>
                                </div>
                            </div>
                            
                            <p className="text-red-600 text-sm">
                                ⚠️ Setelah dikumpulkan, Anda tidak bisa mengubah jawaban lagi.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleSubmitAll(false)}
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
