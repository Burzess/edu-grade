import { useState, useEffect, useCallback, useRef } from 'react'
import { useBatchSubmitJawaban, useBatchAIGrading } from '@/hooks/use-jawaban'
import { useStartUjianSiswa } from '@/hooks/use-ujian'
import { toast } from 'sonner'

export type AutoSubmitReason = 'manual' | 'time_expired' | 'violation'

type OrganizedQuestion = { soal?: { id?: string } | null }

/**
 * Submits exam answers to the submit API with retry logic.
 * Returns true if submission succeeded, false otherwise.
 */
async function submitToApi(
    ujianId: string,
    jawaban: Array<{ soal_id: string; answer_text: string }>,
    autoSubmitReason: AutoSubmitReason,
    maxRetries: number = 0,
    retryIntervalMs: number = 2000
): Promise<{ success: boolean; data?: Record<string, unknown> }> {
    let lastError: unknown = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(`/api/ujian/${ujianId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jawaban, autoSubmitReason }),
            })

            if (response.ok) {
                const data = await response.json() as Record<string, unknown>
                return { success: true, data }
            }

            // Non-retryable client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
                const errorData = await response.json().catch(() => null)
                return { success: false, data: errorData as Record<string, unknown> | undefined }
            }

            // Server error (5xx) — retryable
            lastError = new Error(`Server error: ${response.status}`)
        } catch (error: unknown) {
            // Network error — retryable
            lastError = error
        }

        // Wait before retrying (skip wait on last attempt)
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryIntervalMs))
        }
    }

    return { success: false, data: { error: lastError instanceof Error ? lastError.message : 'Unknown error' } }
}

export const useUjianLogic = (ujianId: string, organizedQuestions: OrganizedQuestion[], ujian?: { kelas_id?: string; duration_minutes?: number; start_time?: string; end_time?: string }, onSubmitted?: () => void) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [navigatorOpen, setNavigatorOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const batchSubmit = useBatchSubmitJawaban()
    const batchAIGrading = useBatchAIGrading()
    const startUjianSiswaMutation = useStartUjianSiswa()

    const autoSubmitRef = useRef<(() => void) | null>(null)
    const timeExpiredAutoSubmitTriggeredRef = useRef(false)

    const handleSubmitAll = useCallback(async (isAutoSubmit = false, autoSubmitReason: AutoSubmitReason = 'manual') => {
        try {
            const now = Date.now()

            if (isSubmitting) {
                return
            }

            if (batchSubmit.isPending) {
                return
            }

            if (now - lastSubmissionTime < 2000) {
                toast.warning('Mohon tunggu sebelum mencoba submit lagi')
                return
            }

            setIsSubmitting(true)
            setLastSubmissionTime(now)

            if (!ujianId) {
                toast.error('ID ujian tidak valid')
                setIsSubmitting(false)
                return
            }

            if (!organizedQuestions || organizedQuestions.length === 0) {
                toast.error('Tidak ada soal untuk dikumpulkan')
                setIsSubmitting(false)
                return
            }

            // Bypass unanswered-questions confirmation prompt on auto-submit
            const unansweredQuestions = organizedQuestions.filter((q: OrganizedQuestion) =>
                q?.soal?.id && (!answers[q.soal.id] || answers[q.soal.id].trim() === '')
            )


            const uniqueSubmissions = new Map<string, boolean>()

            // Include all answers in session (unanswered as empty strings)
            const submissions = organizedQuestions
                .filter((q: OrganizedQuestion) => q?.soal?.id)
                .map((q: OrganizedQuestion) => ({
                    soal_id: q.soal!.id!,
                    answer_text: answers[q.soal!.id!] || ''
                }))
                .filter((submission) => {
                    const key = `${ujianId}-${submission.soal_id}`
                    if (uniqueSubmissions.has(key)) {
                        return false
                    }
                    uniqueSubmissions.set(key, true)
                    return true
                })

            if (submissions.length === 0) {
                toast.error('Tidak ada jawaban valid untuk dikumpulkan')
                setIsSubmitting(false)
                return
            }

            // Determine the reason for submission
            const reason: AutoSubmitReason = autoSubmitReason

            // Use submit API with retry logic for auto-submit scenarios
            const maxRetries = isAutoSubmit ? 3 : 0
            const retryIntervalMs = 2000

            const result = await submitToApi(
                ujianId,
                submissions,
                reason,
                maxRetries,
                retryIntervalMs
            )

            if (!result.success) {
                setIsSubmitting(false)

                if (isAutoSubmit) {
                    toast.error(
                        'Gagal mengumpulkan ujian otomatis setelah beberapa percobaan. Silakan coba submit manual.',
                        { duration: 5000 }
                    )
                } else {
                    const errorData = result.data as { message?: string } | undefined
                    toast.error(errorData?.message || 'Gagal mengumpulkan ujian. Silakan coba lagi.')
                }
                return
            }

            try {
                localStorage.removeItem(`ujian_${ujianId}_answers`)
            } catch {
                // Ignore storage errors
            }

            setIsSubmitting(false)
            setIsSubmitted(true)
            onSubmitted?.()

            // AUTO AI GRADING: Trigger batch AI grading untuk semua jawaban sekaligus
            if (result.success) {
                console.log('🚀 Starting batch AI grading for all answers...')
                try {
                    await batchAIGrading.mutateAsync({
                        ujianId: ujianId,
                        options: {
                            useBatching: true,
                            useOptimized: true,
                            forceAI: false
                        }
                    })
                    console.log('✅ Batch AI grading completed')
                } catch (error) {
                    console.error('❌ Batch AI grading failed:', error)
                }
            }

            // Display grading result feedback if available
            const gradingResult = (result.data as { gradingResult?: { autoGradedCount?: number; skippedEssayCount?: number; totalJawaban?: number } } | undefined)?.gradingResult
            const gradingDescription = gradingResult
                ? `${gradingResult.autoGradedCount} soal pilihan ganda dinilai otomatis.${gradingResult.skippedEssayCount ? ` ${gradingResult.skippedEssayCount} soal essay menunggu penilaian guru.` : ''}`
                : undefined

            if (ujian?.kelas_id) {
                toast.success(
                    isAutoSubmit
                        ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                        : 'Ujian berhasil dikumpulkan!',
                    { description: gradingDescription || 'Anda akan diarahkan ke halaman kelas...' }
                )
            } else {
                toast.success(
                    isAutoSubmit
                        ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                        : 'Ujian berhasil dikumpulkan!',
                    { description: gradingDescription }
                )
            }

            setTimeout(() => {
                if (ujian?.kelas_id) {
                    window.location.href = `/siswa/kelas/${ujian.kelas_id}`
                } else {
                    window.location.href = '/siswa/dashboard'
                }
            }, isAutoSubmit ? 2000 : 1000)

        } catch (error: unknown) {
            setIsSubmitting(false)

            let errorMessage = 'Gagal mengumpulkan ujian'

            if (error instanceof Error) {
                if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = 'Masalah koneksi internet. Jawaban tersimpan lokal, silakan coba submit lagi.'
                } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
                    errorMessage = 'Sesi login berakhir. Silakan login kembali.'
                } else {
                    errorMessage = `Gagal mengumpulkan ujian: ${error.message}`
                }
            }

            toast.error(
                isAutoSubmit
                    ? `Gagal mengumpulkan ujian otomatis: ${errorMessage}`
                    : errorMessage
            )
        }
    }, [organizedQuestions, answers, batchSubmit.isPending, ujianId, ujian?.kelas_id, onSubmitted, isSubmitting, lastSubmissionTime])

    useEffect(() => {
        autoSubmitRef.current = () => handleSubmitAll(true, 'time_expired')
    }, [handleSubmitAll])

    useEffect(() => {
        const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
            if (isSubmitted) {
                return
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isSubmitted])

    const handleAnswerChange = useCallback((soalId: string, answer: string) => {
        if (!soalId) {
            return
        }

        setAnswers(prev => {
            const updated = { ...prev, [soalId]: answer }

            try {
                const localKey = `ujian_${ujianId}_answers`
                localStorage.setItem(localKey, JSON.stringify(updated))
            } catch {
                // Ignore storage errors
            }

            return updated
        })
    }, [ujianId])

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

    const handleQuestionSelect = useCallback((index: number) => {
        setCurrentQuestionIndex(index)
    }, [])

    const registerToUjian = useCallback((ujian: any, isRemidi = false) => {
        if (!ujian || !ujianId) return

        if (startUjianSiswaMutation.isPending) {
            return
        }

        if (ujian.status === 'active') {
            startUjianSiswaMutation.mutate({ ujianId, isRemidi }, {
                onError: (error: any) => {
                    if (!error.message.includes('sudah terdaftar')) {
                        toast.error('Gagal mendaftarkan ke ujian: ' + error.message)
                    }
                }
            })
        }
    }, [ujianId, startUjianSiswaMutation])

    const setupTimer = useCallback((ujian: { duration_minutes?: number; start_time?: string; end_time?: string }, studentStartedAt?: string) => {
        if (!ujian?.duration_minutes) return

        const baseTime = studentStartedAt
            ? new Date(studentStartedAt)
            : ujian.start_time
                ? new Date(ujian.start_time)
                : new Date()

        let endTime = new Date(baseTime.getTime() + ujian.duration_minutes * 60 * 1000)

        if (ujian.end_time) {
            const examEndTime = new Date(ujian.end_time)
            if (examEndTime < endTime) {
                endTime = examEndTime
            }
        }

        let lastNotifiedMinute = -1
        let lastNotifiedSecond = -1

        const updateTimer = () => {
            const now = new Date()
            const remaining = Math.max(0, endTime.getTime() - now.getTime())
            const remainingSeconds = Math.floor(remaining / 1000)

            setTimeLeft(prev => {
                if (prev !== remainingSeconds) {
                    return remainingSeconds
                }
                return prev
            })

            // Trigger auto-submit within 2 seconds of timer reaching zero
            if (remainingSeconds <= 0 && !timeExpiredAutoSubmitTriggeredRef.current) {
                timeExpiredAutoSubmitTriggeredRef.current = true

                // Display notification to student on time expiry
                toast.warning('Waktu ujian habis! Otomatis mengumpulkan jawaban...', {
                    duration: 5000
                })

                // Trigger auto-submit within 1 second (well within the 2-second requirement)
                setTimeout(() => {
                    if (autoSubmitRef.current) {
                        autoSubmitRef.current()
                    }
                }, 500)

                return
            }

            const minutesLeft = Math.floor(remainingSeconds / 60)
            if (remainingSeconds > 0 && remainingSeconds <= 300 && remainingSeconds % 60 === 0) {
                if (lastNotifiedMinute !== minutesLeft) {
                    lastNotifiedMinute = minutesLeft
                    toast.warning(`Sisa waktu: ${minutesLeft} menit!`, { duration: 2000 })
                }
            }

            if (remainingSeconds > 0 && remainingSeconds <= 60 && remainingSeconds % 10 === 0) {
                if (lastNotifiedSecond !== remainingSeconds) {
                    lastNotifiedSecond = remainingSeconds
                    toast.error(`Sisa waktu: ${remainingSeconds} detik!`, { duration: 1000 })
                }
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [])

    return {
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        setAnswers,
        timeLeft,
        navigatorOpen,
        setNavigatorOpen,
        isSubmitting,
        isSubmitted,
        handleSubmitAll,
        handleAnswerChange,
        handleNext,
        handlePrev,
        handleQuestionSelect,
        registerToUjian,
        setupTimer,
        batchSubmit
    }
}
