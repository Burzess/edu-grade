"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import '@/styles/anti-screenshot.css'
import { useParams, useRouter } from 'next/navigation'
import { useUjianForSiswa } from '@/hooks/use-jawaban'
import { useOptimizedJawabanByUjian } from '@/hooks/use-optimized-jawaban'
import { useUjianLogic } from '@/hooks/use-ujian-logic'
import { useAuthStore } from '@/store/auth' // PERBAIKAN: Tambah import useAuthStore
import { toast } from 'sonner'
import { SiswaOnlyGuard } from '@/components/auth/role-guard'
import { ExamSecurityProvider, useExamSecurityContext } from '@/components/providers/exam-security-provider'
import { ScreenshotWarningOverlay, ScreenshotToast } from '@/components/security/ScreenshotWarningOverlay'
import { SecurityViolationModal } from '@/components/security/SecurityViolationModal'
import { 
    QuestionCard, 
    QuestionNavigator, 
    UjianHeader, 
    SectionTabs, 
    SubmitDialog,
    ExamSecurityStatus
} from '@/components/ujian'
import ExamRulesDialog from '@/components/ujian/ExamRulesDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

function UjianSiswaPageContent({ onSubmitted }: { onSubmitted?: () => void }) {
    const params = useParams()
    const router = useRouter()
    const ujianId = params.id as string

    const [showSubmitDialog, setShowSubmitDialog] = useState(false)

    // State untuk dialog larangan
    const [showRulesDialog, setShowRulesDialog] = useState(true)
    
    // State untuk toggle section tabs
    const [showSectionTabs, setShowSectionTabs] = useState(true)
    
    // State untuk screenshot warning
    const [showScreenshotWarning, setShowScreenshotWarning] = useState(false)
    const [screenshotWarningType, setScreenshotWarningType] = useState<'keyboard' | 'touch' | 'api' | 'multiple'>('keyboard')
    const [screenshotAttemptCount, setScreenshotAttemptCount] = useState(0)
    const [showScreenshotToast, setShowScreenshotToast] = useState(false)
    const [screenshotToastMessage, setScreenshotToastMessage] = useState('')
    const [screenshotDetails, setScreenshotDetails] = useState<any>({})
    
    // State untuk security violation modal
    const [showSecurityModal, setShowSecurityModal] = useState(false)
    const [securityViolationType, setSecurityViolationType] = useState<'tab_switch' | 'screenshot' | 'right_click' | 'key_combination'>('tab_switch')
    const [securityViolationCount, setSecurityViolationCount] = useState(0)
    const [securityViolationDetails, setSecurityViolationDetails] = useState<any>({})
    const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false)
    
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
        isSubmitting, // NEW: Get isSubmitting state
        isSubmitted, // NEW: Get isSubmitted state
        handleSubmitAll,
        handleAnswerChange,
        handleNext,
        handlePrev,
        handleQuestionSelect,
        registerToUjian,
        setupTimer,
        batchSubmit
    } = useUjianLogic(ujianId, organizedQuestions, ujian, onSubmitted)

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

    // Handle security modal events
    useEffect(() => {
        const handleShowSecurityModal = (event: CustomEvent) => {
            const { violationType, violationCount, details, autoSubmitWarning } = event.detail
            setSecurityViolationType(violationType)
            setSecurityViolationCount(violationCount)
            setSecurityViolationDetails(details)
            setShowAutoSubmitWarning(autoSubmitWarning)
            setShowSecurityModal(true)
        }

        const handleAutoSubmitExam = () => {
            console.log('Auto-submit triggered by security violation')
            // Trigger auto submit
            handleSubmitAll(true).then(() => {
                // Ensure redirect happens even if handleSubmitAll doesn't redirect
                setTimeout(() => {
                    window.location.href = '/siswa/dashboard'
                }, 2000)
            }).catch((error) => {
                console.error('Auto-submit failed:', error)
                toast.error('Gagal auto-submit ujian. Silakan submit manual.')
            })
        }

        window.addEventListener('showSecurityModal', handleShowSecurityModal as EventListener)
        window.addEventListener('autoSubmitExam', handleAutoSubmitExam)

        return () => {
            window.removeEventListener('showSecurityModal', handleShowSecurityModal as EventListener)
            window.removeEventListener('autoSubmitExam', handleAutoSubmitExam)
        }
    }, [handleSubmitAll])



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
            <div className="min-h-screen bg-background anti-screenshot-container">
                {/* Dialog larangan sebelum mulai ujian */}
                <ExamRulesDialog
                    open={showRulesDialog}
                    onConfirm={() => setShowRulesDialog(false)}
                />
            {/* Enhanced Header with timer and security status */}
            <div className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 ${showRulesDialog ? 'pointer-events-none opacity-50 select-none' : ''}`}>
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex-1">
                            <UjianHeader
                                ujian={ujian}
                                answeredCount={answeredCount}
                                totalQuestions={organizedQuestions.length}
                                timeLeft={timeLeft}
                                onSubmit={handleShowSubmitDialog}
                                isSubmitting={batchSubmit.isPending}
                                formatTime={formatTime}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Section Progress Tabs */}
            {showSectionTabs && (
                <div className={showRulesDialog ? 'pointer-events-none opacity-50 select-none' : ''}>
                    <SectionTabs
                        questionSections={questionSections}
                        currentSectionType={currentSectionType}
                        sectionProgress={sectionProgress}
                        onSectionSwitch={handleSwitchToSection}
                    />
                </div>
            )}

            {/* Main content with optimized desktop layout */}
            <div className="flex flex-col xl:flex-row gap-0">
                {/* Main Question Area - Better desktop spacing */}
                 <div className={`flex-1 p-3 sm:p-4 lg:p-6 xl:p-8 xl:pr-6 min-h-screen exam-content ${showRulesDialog ? 'pointer-events-none opacity-50 select-none' : ''}`}>
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
                        
                        {/* DEBUG: Test button untuk tab switch */}
                        {/* {process.env.NODE_ENV === 'development' && (
                            <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 border border-yellow-400 rounded-md">
                                <h4 className="font-bold text-sm mb-2">🔧 Debug Tools</h4>
                                <button 
                                    onClick={() => {
                                        console.log('🧪 Simulating tab switch returned event')
                                        window.dispatchEvent(new Event('focus'))
                                        document.dispatchEvent(new Event('visibilitychange'))
                                    }}
                                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded mr-2"
                                >
                                    Test Tab Return
                                </button>
                                <button 
                                    onClick={() => {
                                        console.log('🧪 Simulating right click')
                                        document.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
                                    }}
                                    className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    Test Right Click
                                </button>
                            </div>
                        )} */}
                    </div>
                </div>

                {/* Desktop Question Navigator Sidebar */}
                {organizedQuestions.length > 0 && (
                    <div className={`xl:w-80 xl:flex-shrink-0 xl:border-l xl:bg-muted/50 ${showRulesDialog ? 'pointer-events-none opacity-50 select-none' : ''}`}>
                        <div className="xl:sticky xl:top-20 xl:max-h-[calc(100vh-5rem)] xl:overflow-hidden">
                            {/* Toggle Section Tabs Button - Di header sidebar */}
                            {/* <div className="p-3 border-b border-border/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSectionTabs(!showSectionTabs)}
                                    className="w-full text-xs text-muted-foreground hover:text-foreground justify-start"
                                >
                                    {showSectionTabs ? (
                                        <>📄 Sembunyikan Section Tabs</>
                                    ) : (
                                        <>📄 Tampilkan Section Tabs</>
                                    )}
                                </Button>
                            </div> */}
                            
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
                    isOpen={showSubmitDialog && !showRulesDialog}
                    onOpenChange={setShowSubmitDialog}
                    onConfirm={() => handleSubmitAll(false)}
                    sectionProgress={sectionProgress}
                    totalAnswered={answeredCount}
                    totalQuestions={organizedQuestions.length}
                    isSubmitting={isSubmitting || batchSubmit.isPending}
                    ujian={ujian} 
                />

            {/* Screenshot Warning Components */}
            <ScreenshotWarningOverlay
                isVisible={showScreenshotWarning}
                onClose={() => setShowScreenshotWarning(false)}
                warningType={screenshotWarningType}
                attemptCount={screenshotAttemptCount}
                details={{
                    method: screenshotDetails.method,
                    deviceType: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
                    severity: screenshotAttemptCount >= 3 ? 'high' : screenshotAttemptCount >= 2 ? 'medium' : 'low'
                }}
            />

            <ScreenshotToast
                isVisible={showScreenshotToast}
                onClose={() => setShowScreenshotToast(false)}
                message={screenshotToastMessage}
                type={screenshotAttemptCount >= 2 ? 'error' : 'warning'}
                duration={4000}
            />

            {/* Security Violation Modal */}
            <SecurityViolationModal
                isOpen={showSecurityModal}
                onClose={() => setShowSecurityModal(false)}
                violationType={securityViolationType}
                violationCount={securityViolationCount}
                details={securityViolationDetails}
                autoSubmitWarning={showAutoSubmitWarning}
            />
        </div>
    )
}

// Wrapper component to handle security violations
function UjianSiswaWithSecurity() {
    const params = useParams()
    const ujianId = params.id as string
    const { user } = useAuthStore()
    const [isSubmitted, setIsSubmitted] = useState(false)

    // Handler untuk pelanggaran keamanan di level provider dengan logic alert
    const handleSecurityViolation = useCallback((violationType: string, details?: any) => {
        // Debug logging
        console.log(`🔍 DEBUG - Security Violation Detected:`, {
            type: violationType,
            details,
            action: details?.action,
            tabSwitchCount: details?.tabSwitchCount
        })

        // Log security violation untuk audit trail
        console.warn(`Security Violation in Exam ${ujianId}:`, {
            type: violationType,
            details,
            userId: user?.id,
            examId: ujianId,
            timestamp: new Date().toISOString()
        })

        // Handle ALL security violations - trigger modal from context
        const totalCount = details?.totalViolationCount || 1
        
        if (violationType === 'tab_switch' && details?.action === 'returned') {
            console.log('🚨 Showing tab switch modal for returned action')
            // Broadcast event untuk modal
            window.dispatchEvent(new CustomEvent('showSecurityModal', {
                detail: {
                    violationType: 'tab_switch',
                    violationCount: totalCount,
                    details,
                    autoSubmitWarning: totalCount >= 2
                }
            }))
        } else if (violationType === 'tab_switch' && details?.action === 'left') {
            console.log('📝 Tab switch - left action detected, no modal shown')
        } else if (violationType === 'right_click') {
            window.dispatchEvent(new CustomEvent('showSecurityModal', {
                detail: {
                    violationType: 'right_click',
                    violationCount: totalCount,
                    details,
                    autoSubmitWarning: totalCount >= 2
                }
            }))
        } else if (violationType === 'key_combination') {
            window.dispatchEvent(new CustomEvent('showSecurityModal', {
                detail: {
                    violationType: 'key_combination',
                    violationCount: totalCount,
                    details,
                    autoSubmitWarning: totalCount >= 2
                }
            }))
        }

        // Handle screenshot violations specifically
        if (violationType === 'screenshot_attempt') {
            const method = details?.method || 'unknown'
            const totalCount = details?.totalViolationCount || 1
            
            // Show modal for every violation attempt
            window.dispatchEvent(new CustomEvent('showSecurityModal', {
                detail: {
                    violationType: 'screenshot',
                    violationCount: totalCount,
                    details: { ...details, method },
                    autoSubmitWarning: totalCount >= 2
                }
            }))
            
            // Auto-submit after 3 attempts (jika diperlukan bisa dihandle di sini)
            if (totalCount >= 3) {
                console.warn(`3 total violations reached (${totalCount}), auto-submitting exam`)
                
                // Show countdown toast
                toast.error(`Auto-Submit dalam 3 detik... (Total Pelanggaran: ${totalCount})`, {
                    description: 'Ujian akan otomatis dikumpulkan dan dialihkan ke dashboard.',
                    duration: 3000,
                })
                
                // Modal akan menampilkan peringatan auto-submit
                setTimeout(() => {
                    // Trigger auto-submit logic
                    window.dispatchEvent(new CustomEvent('autoSubmitExam'))
                }, 3000)
            }
        }
    }, [ujianId, user?.id])

    return (
        <ExamSecurityProvider 
            examTitle="Ujian Online"
            autoEnable={true}
            onSecurityViolation={handleSecurityViolation}
            isSubmitted={isSubmitted}
        >
            <UjianSiswaPageContent onSubmitted={() => setIsSubmitted(true)} />
        </ExamSecurityProvider>
    )
}

export default function UjianSiswaPage() {
    return (
        <SiswaOnlyGuard>
            <UjianSiswaWithSecurity />
        </SiswaOnlyGuard>
    )
}
