"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUjianForSiswa } from '@/hooks/use-jawaban'
import { useOptimizedJawabanByUjian } from '@/hooks/use-optimized-jawaban'
import { useUjianLogic } from '@/hooks/use-ujian-logic'
import { useAuthStore } from '@/store/auth' // PERBAIKAN: Tambah import useAuthStore
import { SiswaOnlyGuard } from '@/components/auth/role-guard'
import { 
    QuestionCard, 
    QuestionNavigator, 
    UjianHeader, 
    SectionTabs, 
    SubmitDialog 
} from '@/components/ujian'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    FileText,
    AlertCircle,
    ArrowLeft,
} from 'lucide-react'
import { format, isAfter } from 'date-fns'
import { id } from 'date-fns/locale'
import { 
    organizeQuestions, 
    groupQuestions, 
    getSectionInfo, 
    calculateSectionProgress,
    formatTime 
} from '@/lib/ujian-utils'

function UjianSiswaPageContent() {
    const params = useParams()
    const router = useRouter()
    const ujianId = params.id as string

    const [showSubmitDialog, setShowSubmitDialog] = useState(false)
    
    // Ambil user untuk registration check
    const { user } = useAuthStore()
    const [isRegistered, setIsRegistered] = useState(() => {
        // Check localStorage untuk registration status
        if (typeof window !== 'undefined' && user?.id) {
            const registrationKey = `ujian_registered_${ujianId}_${user.id}`
            return localStorage.getItem(registrationKey) === 'true'
        }
        return false
    }) // Track registration status dengan localStorage

    // Use hooks
    const { data: ujian, isLoading: ujianLoading } = useUjianForSiswa(ujianId)
    const { data: existingAnswers = [] } = useOptimizedJawabanByUjian(ujianId)

    // Kelompokkan dan acak soal berdasarkan question_type
    const organizedQuestions = useMemo(() => 
        organizeQuestions(ujian?.ujian_soal || [], ujianId), 
        [ujian?.ujian_soal, ujianId]
    )

    // Kelompokkan untuk navigator
    const questionSections = useMemo(() => 
        groupQuestions(organizedQuestions), 
        [organizedQuestions]
    )

    // Use ujian logic hook
    const {
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        setAnswers,
        timeLeft,
        navigatorOpen,
        setNavigatorOpen,
        handleSubmitAll,
        handleAnswerChange,
        handleNext,
        handlePrev,
        handleQuestionSelect,
        registerToUjian,
        setupTimer,
        batchSubmit
    } = useUjianLogic(ujianId, organizedQuestions)

    const currentQuestion = organizedQuestions[currentQuestionIndex]
    const currentSectionType = currentQuestion?.soal?.question_type || 'multiple_choice'
    
    // Hitung section index dan total untuk navigasi yang tepat
    const { sectionIndex, sectionTotal } = useMemo(() => 
        getSectionInfo(currentQuestion, questionSections), 
        [currentQuestion, questionSections]
    )

    // Handle switch section
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
            }
        }
    }, [questionSections, organizedQuestions, currentSectionType, setCurrentQuestionIndex])

    const answeredCount = useMemo(() => 
        organizedQuestions
            .filter((q: any) => q?.soal?.id && answers[q.soal.id]?.trim())
            .length,
        [organizedQuestions, answers]
    )

    // Progress untuk setiap section
    const sectionProgress = useMemo(() => 
        calculateSectionProgress(questionSections, answers), 
        [questionSections, answers]
    )

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
    }, [existingAnswers, ujianId, setAnswers])

    // Otomatis mendaftarkan siswa ke ujian_siswa ketika mengakses halaman ujian
    useEffect(() => {
        if (!ujian || !ujianId || ujianLoading || isRegistered || !user?.id) return
        
        // Hanya register sekali saja
        registerToUjian(ujian)
        
        // Mark sebagai sudah register di state dan localStorage
        setIsRegistered(true)
        const registrationKey = `ujian_registered_${ujianId}_${user.id}`
        localStorage.setItem(registrationKey, 'true')
    }, [ujian?.id, ujianId, ujianLoading, registerToUjian, isRegistered, user?.id]) // Dependency lebih spesifik

    // Setup timer ujian - stabilisasi untuk mencegah setup berulang
    useEffect(() => {
        if (!ujian?.start_time || !ujian?.duration_minutes) return
        
        // Hanya setup timer jika belum ada
        const cleanupTimer = setupTimer(ujian)
        return cleanupTimer
    }, [ujian?.start_time, ujian?.duration_minutes, setupTimer]) // Dependency lebih spesifik

    // Handle answer changes with current question context
    const handleCurrentAnswerChange = useCallback((answer: string) => {
        if (!currentQuestion?.soal?.id) {
            console.error('❌ No current question or soal ID available')
            return
        }
        handleAnswerChange(currentQuestion.soal.id, answer)
    }, [currentQuestion?.soal?.id, handleAnswerChange])

    const handleShowSubmitDialog = useCallback(() => {
        setShowSubmitDialog(true)
    }, [])

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

    // Render conditions after all hooks are called
    if (ujianLoading) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <div className="flex justify-between">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
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
                    <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
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
        <div className="min-h-screen bg-background">
            {/* Enhanced Header with timer */}
            <UjianHeader
                ujian={ujian}
                answeredCount={answeredCount}
                totalQuestions={organizedQuestions.length}
                timeLeft={timeLeft}
                onSubmit={handleShowSubmitDialog}
                isSubmitting={batchSubmit.isPending}
                formatTime={formatTime}
            />

            {/* Enhanced Section Progress Tabs */}
            <SectionTabs
                questionSections={questionSections}
                currentSectionType={currentSectionType}
                sectionProgress={sectionProgress}
                onSectionSwitch={handleSwitchToSection}
            />

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
                                onAnswerChange={handleCurrentAnswerChange}
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
                    <div className="xl:w-80 xl:flex-shrink-0 xl:border-l xl:bg-muted/50">
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
            <SubmitDialog
                isOpen={showSubmitDialog}
                onOpenChange={setShowSubmitDialog}
                onConfirm={() => handleSubmitAll(false)}
                sectionProgress={sectionProgress}
                totalAnswered={answeredCount}
                totalQuestions={organizedQuestions.length}
                isSubmitting={batchSubmit.isPending}
            />
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
