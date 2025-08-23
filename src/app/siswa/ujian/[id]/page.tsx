"use client"

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUjianForSiswa, useBatchSubmitJawaban } from '@/hooks/use-jawaban'
import { useStartUjianSiswa, useSubmitUjianSiswa } from '@/hooks/use-ujian'
import { 
  useOptimizedUjianStatus, 
  useOptimizedBatchSubmitJawaban
  // REALTIME REMOVED: useOptimizedUjianStatusChecker disabled
  // useOptimizedUjianStatusChecker 
} from '@/hooks/use-optimized-ujian'
import { 
  useOptimizedDebouncedSubmitJawaban, 
  useOptimizedJawabanByUjian 
} from '@/hooks/use-optimized-jawaban'
// REALTIME REMOVED: Provider imports disabled to prevent infinite requests
// import { 
//   OptimizedRealtimeProvider, 
//   useConnectionHealth, 
//   usePerformanceMonitor 
// } from '@/components/providers/optimized-realtime-provider'
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
        <Card className="w-full shadow-sm border-0 xl:border xl:shadow-md">
            <CardHeader className="pb-3 sm:pb-4 xl:pb-6 px-4 sm:px-6 xl:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl xl:text-2xl flex items-center gap-2 xl:gap-3">
                            {sectionType === 'multiple_choice' ? '📝' : '✍️'}
                            <span>{sectionType === 'multiple_choice' ? 'PILIHAN GANDA' : 'ESSAY'}</span>
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base xl:text-lg mt-1">
                            Soal {sectionIndex + 1} dari {sectionTotal} ({sectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'})
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 sm:text-right">
                        <div className="text-xs sm:text-sm xl:text-base text-muted-foreground">
                            Progress: {index + 1}/{total}
                        </div>
                        <Progress value={((index + 1) / total) * 100} className="w-20 sm:w-24 xl:w-32" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 xl:space-y-8 px-4 sm:px-6 xl:px-8">
                {/* Question - Improved desktop styling */}
                <div className="p-4 sm:p-6 xl:p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg xl:rounded-2xl border border-blue-200">
                    <div className="font-semibold mb-3 xl:mb-4 text-blue-900 text-sm sm:text-base xl:text-lg">
                        Pertanyaan:
                    </div>
                    <div className="text-gray-800 whitespace-pre-wrap text-sm sm:text-base xl:text-lg leading-relaxed xl:leading-loose">
                        {soal.question_text}
                    </div>
                </div>

                {/* Answer Input - Enhanced for desktop */}
                <div className="space-y-3 sm:space-y-4 xl:space-y-6">
                    <label className="text-sm sm:text-base xl:text-lg font-semibold text-gray-700">
                        Jawaban Anda: <span className="text-xs xl:text-sm text-gray-500 font-normal">(Opsional - boleh dikosongkan)</span>
                    </label>
                    {soal.question_type === 'essay' ? (
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Tulis jawaban Anda di sini dengan lengkap dan jelas... (Boleh dikosongkan jika tidak yakin)"
                                value={answer}
                                onChange={(e) => onAnswerChange(e.target.value)}
                                rows={6}
                                className="min-h-[150px] sm:min-h-[200px] xl:min-h-[250px] text-sm sm:text-base xl:text-lg leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 border-2"
                            />
                        </div>
                    ) : (
                        // Multiple choice options - Enhanced for desktop
                        <div className="space-y-2 sm:space-y-3 xl:space-y-4">
                            {soal.options?.map((option: any, optIndex: number) => (
                                <label 
                                    key={option.id} 
                                    className={`
                                        flex items-start space-x-3 xl:space-x-4 p-3 sm:p-4 xl:p-5 rounded-lg xl:rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                        ${answer === option.id 
                                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${soal.id}`}
                                        value={option.id}
                                        checked={answer === option.id}
                                        onChange={(e) => onAnswerChange(e.target.value)}
                                        className="mt-0.5 sm:mt-1 w-4 h-4 xl:w-5 xl:h-5 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className={`
                                            font-semibold mr-2 xl:mr-3 text-sm sm:text-base xl:text-lg
                                            ${answer === option.id ? 'text-blue-700' : 'text-gray-600'}
                                        `}>
                                            {String.fromCharCode(65 + optIndex)}.
                                        </span>
                                        <span className={`
                                            text-sm sm:text-base xl:text-lg leading-relaxed xl:leading-loose break-words
                                            ${answer === option.id ? 'text-blue-900' : 'text-gray-800'}
                                        `}>
                                            {option.text}
                                        </span>
                                    </div>
                                </label>
                            ))}
                            
                            {/* Clear selection option - Enhanced */}
                            {answer && (
                                <button
                                    onClick={() => onAnswerChange('')}
                                    className="w-full p-2 mt-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    🗑️ Hapus Pilihan (Kosongkan Jawaban)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation - Enhanced desktop layout */}
                <div className="flex items-center justify-between pt-6 xl:pt-8 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isFirst || isSaving}
                        className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base"
                    >
                        <ArrowLeft className="h-4 w-4 xl:h-5 xl:w-5" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                        <span className="sm:hidden">Prev</span>
                    </Button>

                    <div className="flex flex-col items-center gap-1 xl:gap-2 text-center px-2">
                        {/* Answer status */}
                        {answer.trim() ? (
                            <div className="flex items-center gap-2 xl:gap-3 text-green-600">
                                <CheckCircle className="h-4 w-4 xl:h-5 xl:w-5" />
                                <span className="text-xs sm:text-sm xl:text-base font-medium">Dijawab</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 xl:gap-3 text-gray-500">
                                <AlertCircle className="h-4 w-4 xl:h-5 xl:w-5" />
                                <span className="text-xs sm:text-sm xl:text-base font-medium">Kosong (skor 0)</span>
                            </div>
                        )}
                        <div className="text-xs xl:text-sm text-muted-foreground">
                            {sectionIndex + 1}/{sectionTotal}
                        </div>
                    </div>

                    {isLast ? (
                        <Button 
                            onClick={onSubmit} 
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base"
                        >
                            <Send className="h-4 w-4 xl:h-5 xl:w-5" />
                            <span className="hidden sm:inline">
                                {isSaving ? 'Menyimpan...' : 'Selesai'}
                            </span>
                            <span className="sm:hidden">
                                {isSaving ? 'Save...' : 'Done'}
                            </span>
                        </Button>
                    ) : (
                        <Button 
                            onClick={onNext} 
                            disabled={isSaving}
                            className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base"
                        >
                            <span className="hidden sm:inline">Selanjutnya</span>
                            <span className="sm:hidden">Next</span>
                            <ArrowRight className="h-4 w-4 xl:h-5 xl:w-5" />
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
            {/* Mobile Toggle Button - Hidden on desktop */}
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="fixed top-16 sm:top-20 right-2 sm:right-4 z-20 xl:hidden shadow-lg p-2"
            >
                <Grid3X3 className="h-4 w-4" />
            </Button>

            {/* Enhanced Navigator Panel for desktop */}
            <div className={`
                fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-30 transition-transform duration-300
                w-72 sm:w-80 xl:w-full
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                xl:translate-x-0 xl:relative xl:shadow-none xl:z-10 xl:bg-gray-50/50 xl:border-gray-300
            `}>
                <div className="p-3 sm:p-4 xl:p-6 border-b border-gray-200 xl:border-gray-300 xl:bg-white">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base xl:text-lg">
                            {sectionType === 'multiple_choice' ? '📝 PILIHAN GANDA' : '✍️ ESSAY'}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className="xl:hidden p-1"
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="text-xs xl:text-sm text-gray-500 mt-1">
                        {questions.length} soal tersedia
                    </div>
                </div>

                <div className="p-3 sm:p-4 xl:p-6 h-full overflow-y-auto pb-20 xl:pb-6">
                    <div className="grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-6 gap-2 xl:gap-3">
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
                                        w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-md xl:rounded-lg border-2 text-sm xl:text-base font-semibold transition-all duration-200 relative hover:scale-105
                                        ${isCurrent 
                                            ? 'border-blue-500 bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-300 ring-offset-2' 
                                            : isAnswered
                                                ? 'border-green-500 bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {index + 1}
                                    {isAnswered && !isCurrent && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 xl:w-4 xl:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Enhanced Legend for desktop */}
                    <div className="mt-4 xl:mt-6 pt-4 xl:pt-6 border-t border-gray-200 xl:border-gray-300">
                        <div className="text-xs xl:text-sm text-gray-600 space-y-2 xl:space-y-3">
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-blue-500 rounded xl:rounded-md border-2 border-blue-500 ring-2 ring-blue-300 ring-offset-1"></div>
                                <span className="xl:font-medium">Soal saat ini</span>
                            </div>
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-green-100 rounded xl:rounded-md border-2 border-green-500 relative">
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 xl:w-3 xl:h-3 bg-green-500 rounded-full border border-white"></div>
                                </div>
                                <span className="xl:font-medium">Sudah dijawab</span>
                            </div>
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-white rounded xl:rounded-md border-2 border-gray-300"></div>
                                <span className="xl:font-medium">Kosong (skor 0)</span>
                            </div>
                        </div>
                        <div className="mt-3 xl:mt-4 p-2 xl:p-3 bg-yellow-50 rounded xl:rounded-lg text-xs xl:text-sm text-yellow-700">
                            💡 <span className="xl:font-medium">Soal yang tidak dijawab akan otomatis mendapat skor 0</span>
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

    // Use hooks
    const { data: ujian, isLoading: ujianLoading } = useUjianForSiswa(ujianId)
    const { data: existingAnswers = [] } = useOptimizedJawabanByUjian(ujianId)
    const batchSubmit = useBatchSubmitJawaban() // Use proper batch submit
    const { debouncedSubmit, forceSubmit } = useOptimizedDebouncedSubmitJawaban()
    
    // REALTIME REMOVED: Status checker disabled to prevent infinite requests
    // useOptimizedUjianStatusChecker()
    
    // Use connection and performance monitoring
    // REALTIME REMOVED: Connection health monitoring disabled
    // useConnectionHealth()
    // REALTIME REMOVED: Performance monitoring disabled
    // usePerformanceMonitor()
    
    // Mutations
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
        let submissions: any[] = [];
        
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
                    `Masih ada ${unansweredQuestions.length} soal yang tidak dijawab dan akan mendapat skor 0. Yakin ingin mengumpulkan ujian?`
                );
                if (!confirmSubmit) return;
            }

            console.log('📤 Final submit - saving all answers...', {
                isAutoSubmit,
                totalQuestions: organizedQuestions.length,
                answeredQuestions: organizedQuestions.length - unansweredQuestions.length,
                unansweredQuestions: unansweredQuestions.length
            });

            submissions = organizedQuestions
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

            // FIXED: Use actual batch submit instead of mock submission
            console.log('� Submitting answers with proper batch mutation...');
            
            // Use the proper batch submit hook
            try {
                const result = await batchSubmit.mutateAsync(submissions);
                console.log('✅ Batch submit successful:', result);
                
                // Trigger AI grading for essay questions in background
                // The result should contain the saved jawaban records with IDs
                if (Array.isArray(result)) {
                    result.forEach(async (savedJawaban) => {
                        // Only trigger AI grading for essay questions
                        const question = organizedQuestions.find((q: any) => q.soal.id === savedJawaban.soal_id);
                        if (question?.soal?.question_type === 'essay' && savedJawaban.jawaban) {
                            try {
                                const response = await fetch('/api/ai-grading', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ jawabanId: savedJawaban.id }),
                                });
                                
                                if (response.ok) {
                                    console.log('🤖 AI grading triggered for essay jawaban:', savedJawaban.id);
                                }
                            } catch (error) {
                                console.log('⚠️ AI grading trigger failed (background):', error);
                                // Don't throw - this shouldn't block submission
                            }
                        }
                    });
                }

            } catch (error) {
                console.error('❌ Error in batch submission:', error);
                toast.error('Gagal menyimpan jawaban. Silakan coba lagi.');
                return;
            }

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
            console.error('❌ Critical error in handleSubmitAll:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                isAutoSubmit,
                submissionsLength: submissions?.length
            });
            
            toast.error(
                isAutoSubmit
                    ? 'Gagal mengumpulkan ujian otomatis. Silakan coba manual.'
                    : `Gagal mengumpulkan ujian: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`
            );
        }
    }, [organizedQuestions, answers, batchSubmit, submitUjianSiswaMutation, ujianId, router]); // FIXED: Added batchSubmit back to dependencies

    // Auto submit ref untuk timer - stabilize the reference
    const autoSubmitRef = useRef<(() => void) | null>(null);
    
    useEffect(() => {
        autoSubmitRef.current = () => handleSubmitAll(true);
    });

    // Handle force save (for page unload, etc.)
    useEffect(() => {
        const handleBeforeUnload = async () => {
            await forceSubmit();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Final save on unmount
            forceSubmit();
        };
    }, [forceSubmit]);

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
            // FIXED: Removed startUjianSiswaMutation from dependency to prevent infinite loop
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
    }, [ujian, ujianId, ujianLoading]) // FIXED: Removed startUjianSiswaMutation from dependencies

    // Timer logic - stabilize dependencies
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
    }, [ujian?.start_time, ujian?.duration_minutes]) // Remove dependencies that cause re-renders

    const formatTime = useCallback((seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`
    }, [])

    // Handle answer changes with optimized auto-save
    const handleAnswerChange = useCallback((answer: string) => {
        if (!currentQuestion?.soal?.id) {
            console.error('❌ No current question or soal ID available')
            return
        }

        const soalId = currentQuestion.soal.id;

        // Update local state immediately for UI responsiveness
        setAnswers(prev => ({ ...prev, [soalId]: answer }));

        // Save to localStorage for backup
        const localKey = `ujian_${ujianId}_answers`
        const updatedAnswers = { ...answers, [soalId]: answer };
        localStorage.setItem(localKey, JSON.stringify(updatedAnswers));

        console.log('🔄 Answer changed for soal:', soalId, 'triggering auto-save...');
        
        // Trigger optimized auto-save with debouncing
        debouncedSubmit({
            ujian_id: ujianId,
            soal_id: soalId,
            answer_text: answer
        });
    }, [currentQuestion?.soal?.id, ujianId, answers, debouncedSubmit]);

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
            {/* Enhanced Header with timer - Better desktop layout */}
            <div className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="container mx-auto px-3 sm:px-4 xl:px-8 py-2 sm:py-3 xl:py-4">
                    <div className="flex items-center justify-between gap-2 xl:gap-6">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base sm:text-lg xl:text-2xl font-semibold truncate">{ujian.name}</h1>
                            <p className="text-xs sm:text-sm xl:text-base text-muted-foreground truncate">
                                Guru: {ujian.profiles?.full_name}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 xl:gap-6 flex-shrink-0">
                            {/* Progress - Enhanced for desktop */}
                            <div className="hidden sm:block text-xs sm:text-sm xl:text-base text-center">
                                <div className="font-medium xl:font-semibold">{answeredCount}/{organizedQuestions.length}</div>
                                <div className="text-muted-foreground">dijawab</div>
                            </div>

                            {/* Enhanced Timer */}
                            {timeLeft !== null && (
                                <div className={`
                                    flex items-center gap-1 xl:gap-2 px-3 py-2 xl:px-4 xl:py-3 rounded-md xl:rounded-lg text-xs sm:text-sm xl:text-base font-bold
                                    ${timeLeft < 300 ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}
                                    shadow-sm xl:shadow-md
                                `}>
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 xl:h-5 xl:w-5" />
                                    <span className="font-mono text-xs sm:text-sm xl:text-base">
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShowSubmitDialog}
                                disabled={batchSubmit.isPending}
                                className="text-xs px-3 py-2 xl:px-4 xl:py-3 h-8 sm:h-9 xl:h-10 xl:text-sm border-green-300 text-green-700 hover:bg-green-50"
                            >
                                <Send className="h-3 w-3 sm:h-4 sm:w-4 xl:h-4 xl:w-4 mr-1 xl:mr-2" />
                                <span className="hidden sm:inline">Kumpulkan</span>
                                <span className="sm:hidden">Submit</span>
                            </Button>
                        </div>
                    </div>
                    
                    {/* Progress bar for small screens */}
                    <div className="sm:hidden mt-2 flex items-center gap-2 text-xs">
                        <span>{answeredCount}/{organizedQuestions.length} dijawab</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-1">
                            <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${(answeredCount / Math.max(organizedQuestions.length, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Enhanced keyboard shortcuts info for desktop */}
                    <div className="hidden xl:block absolute top-3 right-8 text-xs text-muted-foreground text-right bg-gray-50 px-3 py-1 rounded-md border">
                        <div>⌨️ Shortcut: ← → Navigasi | 1 PG | 2 Essay</div>
                    </div>
                </div>
            </div>

            {/* Enhanced Section Progress Tabs */}
            <div className="bg-white border-b">
                <div className="container mx-auto px-3 sm:px-4 xl:px-8">
                    <div className="flex gap-2 sm:gap-4 xl:gap-12 overflow-x-auto scrollbar-hide">
                        {questionSections.multipleChoice.length > 0 && (
                            <button
                                onClick={() => handleSwitchToSection('multiple_choice')}
                                className={`
                                    flex-shrink-0 py-3 xl:py-4 px-3 xl:px-4 border-b-3 xl:border-b-4 transition-all duration-300 hover:scale-105
                                    ${currentSectionType === 'multiple_choice' 
                                        ? 'border-blue-600 text-blue-600 bg-blue-50 shadow-sm' 
                                        : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-25'
                                    }
                                `}
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-1 xl:gap-3">
                                    <div className="flex items-center gap-2 xl:gap-3">
                                        <span className="text-sm xl:text-lg font-medium">📝</span>
                                        <span className="text-sm xl:text-lg font-semibold">PILIHAN GANDA</span>
                                        <Badge 
                                            variant={currentSectionType === 'multiple_choice' ? 'default' : 'secondary'}
                                            className="text-xs xl:text-sm px-2 py-1 xl:px-3 xl:py-1"
                                        >
                                            {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total}
                                        </Badge>
                                    </div>
                                    {currentSectionType !== 'multiple_choice' && (
                                        <span className="text-xs text-gray-400 hidden sm:inline xl:text-sm">↗ Klik untuk beralih</span>
                                    )}
                                </div>
                                <div className="w-20 xl:w-32 bg-gray-200 rounded-full h-1 xl:h-2 mt-2">
                                    <div 
                                        className="bg-blue-600 h-1 xl:h-2 rounded-full transition-all duration-500" 
                                        style={{ width: `${sectionProgress.multipleChoice.percentage}%` }}
                                    />
                                </div>
                            </button>
                        )}

                        {questionSections.essay.length > 0 && (
                            <button
                                onClick={() => handleSwitchToSection('essay')}
                                className={`
                                    flex-shrink-0 py-3 xl:py-4 px-3 xl:px-4 border-b-3 xl:border-b-4 transition-all duration-300 hover:scale-105
                                    ${currentSectionType === 'essay' 
                                        ? 'border-green-600 text-green-600 bg-green-50 shadow-sm' 
                                        : 'border-transparent text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-25'
                                    }
                                `}
                            >
                                <div className="flex flex-col sm:flex-row items-center gap-1 xl:gap-3">
                                    <div className="flex items-center gap-2 xl:gap-3">
                                        <span className="text-sm xl:text-lg font-medium">✍️</span>
                                        <span className="text-sm xl:text-lg font-semibold">ESSAY</span>
                                        <Badge 
                                            variant={currentSectionType === 'essay' ? 'default' : 'secondary'}
                                            className="text-xs xl:text-sm px-2 py-1 xl:px-3 xl:py-1 bg-green-100 text-green-800"
                                        >
                                            {sectionProgress.essay.answered}/{sectionProgress.essay.total}
                                        </Badge>
                                    </div>
                                    {currentSectionType !== 'essay' && (
                                        <span className="text-xs text-gray-400 hidden sm:inline xl:text-sm">↗ Klik untuk beralih</span>
                                    )}
                                </div>
                                <div className="w-20 xl:w-32 bg-gray-200 rounded-full h-1 xl:h-2 mt-2">
                                    <div 
                                        className="bg-green-600 h-1 xl:h-2 rounded-full transition-all duration-500" 
                                        style={{ width: `${sectionProgress.essay.percentage}%` }}
                                    />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main content with optimized desktop layout */}
            <div className="flex flex-col xl:flex-row gap-0">
                {/* Main Question Area - Better desktop spacing */}
                <div className="flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 xl:pr-6 min-h-screen">
                    <div className="max-w-4xl mx-auto xl:mx-0">
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
                                isSaving={batchSubmit.isPending}
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
                </div>

                {/* Desktop Question Navigator Sidebar */}
                {organizedQuestions.length > 0 && (
                    <div className="xl:w-80 xl:flex-shrink-0 xl:border-l xl:bg-gray-50/50">
                        <div className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-5rem)] xl:overflow-hidden">
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
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    {/* Progress dan informasi dikumpulkan ke dalam body content terpisah */}
                    <div className="space-y-3">
                        <div className="bg-blue-50 p-3 rounded-lg text-sm">
                            <div className="font-medium mb-2">📊 Progress Anda:</div>
                            <div className="space-y-1">
                                <div>📝 Pilihan Ganda: {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total} soal</div>
                                <div>✍️ Essay: {sectionProgress.essay.answered}/{sectionProgress.essay.total} soal</div>
                                <div className="font-medium">Total: {answeredCount}/{organizedQuestions.length} soal dijawab</div>
                            </div>
                        </div>
                        
                        {(organizedQuestions.length - answeredCount) > 0 && (
                            <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                                <div className="font-medium text-yellow-800 mb-1">⚠️ Perhatian:</div>
                                <div className="text-yellow-700">
                                    {organizedQuestions.length - answeredCount} soal yang tidak dijawab akan otomatis mendapat skor 0.
                                </div>
                            </div>
                        )}
                        
                        <div className="text-red-600 text-sm">
                            ⚠️ Setelah dikumpulkan, Anda tidak bisa mengubah jawaban lagi.
                        </div>
                    </div>
                    
                    <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleSubmitAll(false)}
                            disabled={batchSubmit.isPending}
                        >
                            {batchSubmit.isPending ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function UjianSiswaPage() {
    return (
        // REALTIME REMOVED: OptimizedRealtimeProvider wrapper dihapus
        <SiswaOnlyGuard>
            <UjianSiswaPageContent />
        </SiswaOnlyGuard>
    )
}
