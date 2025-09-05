"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBatchSubmitJawaban } from '@/hooks/use-jawaban'
import { useStartUjianSiswa, useSubmitUjianSiswa } from '@/hooks/use-ujian'
import { useOptimizedDebouncedSubmitJawaban } from '@/hooks/use-optimized-jawaban'
import { toast } from 'sonner'

export const useUjianLogic = (ujianId: string, organizedQuestions: any[]) => {
    const router = useRouter()
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [navigatorOpen, setNavigatorOpen] = useState(false)

    // Use hooks
    const batchSubmit = useBatchSubmitJawaban()
    const { debouncedSubmit, forceSubmit } = useOptimizedDebouncedSubmitJawaban()
    const startUjianSiswaMutation = useStartUjianSiswa()
    const submitUjianSiswaMutation = useSubmitUjianSiswa()

    // Auto submit ref untuk timer - stabilize the reference
    const autoSubmitRef = useRef<(() => void) | null>(null)

    const handleSubmitAll = useCallback(async (isAutoSubmit = false) => {
        let submissions: any[] = []
        
        try {
            if (!organizedQuestions || organizedQuestions.length === 0) {
                toast.error('Tidak ada soal untuk dikumpulkan')
                return
            }

            const unansweredQuestions = organizedQuestions.filter((q: any) =>
                q?.soal?.id && (!answers[q.soal.id] || answers[q.soal.id].trim() === '')
            )

            if (!isAutoSubmit && unansweredQuestions.length > 0) {
                const confirmSubmit = window.confirm(
                    `Masih ada ${unansweredQuestions.length} soal yang tidak dijawab dan akan mendapat skor 0. Yakin ingin mengumpulkan ujian?`
                )
                if (!confirmSubmit) return
            }

            console.log('📤 Final submit - saving all answers...', {
                isAutoSubmit,
                totalQuestions: organizedQuestions.length,
                answeredQuestions: organizedQuestions.length - unansweredQuestions.length,
                unansweredQuestions: unansweredQuestions.length
            })

            submissions = organizedQuestions
                .filter((q: any) => q?.soal?.id)
                .map((q: any) => ({
                    ujian_id: ujianId,
                    soal_id: q.soal.id,
                    answer_text: answers[q.soal.id] || ''
                }))

            if (submissions.length === 0) {
                toast.error('Tidak ada jawaban valid untuk dikumpulkan')
                return
            }

            console.log('📊 Submitting answers with proper batch mutation...')
            
            try {
                const result = await batchSubmit.mutateAsync(submissions)
                console.log('✅ Batch submit successful:', result)
                
                // Trigger AI grading for essay questions in background
                if (Array.isArray(result)) {
                    result.forEach(async (savedJawaban) => {
                        const question = organizedQuestions.find((q: any) => q.soal.id === savedJawaban.soal_id)
                        if (question?.soal?.question_type === 'essay' && savedJawaban.jawaban) {
                            try {
                                const response = await fetch('/api/ai-grading', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ jawabanId: savedJawaban.id }),
                                })
                                
                                if (response.ok) {
                                    console.log('🤖 AI grading triggered for essay jawaban:', savedJawaban.id)
                                }
                            } catch (error) {
                                console.log('⚠️ AI grading trigger failed (background):', error)
                            }
                        }
                    })
                }

            } catch (error) {
                console.error('❌ Error in batch submission:', error)
                toast.error('Gagal menyimpan jawaban. Silakan coba lagi.')
                return
            }

            // Update status ujian_siswa menjadi completed
            try {
                await submitUjianSiswaMutation.mutateAsync(ujianId)
                console.log('✅ Status ujian_siswa berhasil diupdate menjadi completed')
            } catch (error) {
                console.error('❌ Error updating ujian_siswa status:', error)
            }

            localStorage.removeItem(`ujian_${ujianId}_answers`)

            toast.success(
                isAutoSubmit
                    ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                    : 'Ujian berhasil dikumpulkan!'
            )

            setTimeout(() => {
                router.push('/siswa/dashboard')
            }, isAutoSubmit ? 2000 : 1000)

        } catch (error) {
            console.error('❌ Critical error in handleSubmitAll:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                isAutoSubmit,
                submissionsLength: submissions?.length
            })
            
            toast.error(
                isAutoSubmit
                    ? 'Gagal mengumpulkan ujian otomatis. Silakan coba manual.'
                    : `Gagal mengumpulkan ujian: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`
            )
        }
    }, [organizedQuestions, answers, batchSubmit, submitUjianSiswaMutation, ujianId, router])

    // Setup auto submit ref
    useEffect(() => {
        autoSubmitRef.current = () => handleSubmitAll(true)
    })

    // Handle force save (for page unload, etc.)
    useEffect(() => {
        const handleBeforeUnload = async () => {
            await forceSubmit()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            forceSubmit()
        }
    }, [forceSubmit])

    // Handle answer changes with optimized auto-save
    const handleAnswerChange = useCallback((soalId: string, answer: string) => {
        if (!soalId) {
            console.error('❌ No soal ID available')
            return
        }

        // Update local state immediately for UI responsiveness
        setAnswers(prev => ({ ...prev, [soalId]: answer }))

        // Save to localStorage for backup
        const localKey = `ujian_${ujianId}_answers`
        const updatedAnswers = { ...answers, [soalId]: answer }
        localStorage.setItem(localKey, JSON.stringify(updatedAnswers))

        console.log('🔄 Answer changed for soal:', soalId, 'triggering auto-save...')
        
        // Trigger optimized auto-save with debouncing
        debouncedSubmit({
            ujian_id: ujianId,
            soal_id: soalId,
            answer_text: answer
        })
    }, [ujianId, answers, debouncedSubmit])

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

    // Auto register siswa ke ujian_siswa ketika mengakses halaman ujian
    const registerToUjian = useCallback((ujian: any) => {
        if (!ujian || !ujianId) return
        
        if (ujian.status === 'active') {
            startUjianSiswaMutation.mutate(ujianId, {
                onSuccess: () => {
                    console.log('✅ Siswa berhasil terdaftar untuk ujian:', ujianId)
                },
                onError: (error: any) => {
                    if (error.message.includes('sudah terdaftar')) {
                        console.log('ℹ️ Siswa sudah terdaftar untuk ujian:', ujianId)
                    } else {
                        console.error('❌ Error mendaftarkan siswa:', error)
                        toast.error('Gagal mendaftarkan ke ujian: ' + error.message)
                    }
                }
            })
        }
    }, [ujianId, startUjianSiswaMutation])

    // Timer logic
    const setupTimer = useCallback((ujian: any) => {
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
                        autoSubmitRef.current()
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
    }, [])

    return {
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
    }
}
