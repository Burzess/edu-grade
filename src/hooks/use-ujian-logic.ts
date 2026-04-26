import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useBatchSubmitJawaban, useBatchAIGrading } from '@/hooks/use-jawaban'
import { useStartUjianSiswa, useSubmitUjianSiswa } from '@/hooks/use-ujian'
import { useOptimizedDebouncedSubmitJawaban } from '@/hooks/use-optimized-jawaban'
import { toast } from 'sonner'

export const useUjianLogic = (ujianId: string, organizedQuestions: any[], ujian?: any, onSubmitted?: () => void) => {
    const router = useRouter()
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<{ [key: string]: string }>({})
    const [timeLeft, setTimeLeft] = useState<number | null>(null)
    const [navigatorOpen, setNavigatorOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false) // Submission state flag
    const [lastSubmissionTime, setLastSubmissionTime] = useState<number>(0) // Prevent rapid submissions
    const [isSubmitted, setIsSubmitted] = useState(false) // Track if exam is successfully submitted

    // Use hooks
    const batchSubmit = useBatchSubmitJawaban()
    const batchAIGrading = useBatchAIGrading()
    const { debouncedSubmit, forceSubmit } = useOptimizedDebouncedSubmitJawaban()
    const startUjianSiswaMutation = useStartUjianSiswa()
    const submitUjianSiswaMutation = useSubmitUjianSiswa()

    // Auto submit ref untuk timer - stabilize the reference
    const autoSubmitRef = useRef<(() => void) | null>(null)

    const handleSubmitAll = useCallback(async (isAutoSubmit = false) => {
        let submissions: any[] = []
        
        try {
            const now = Date.now()
            
            // ENHANCED: Multiple layers of duplicate prevention
            if (isSubmitting) {
                console.log('Submit already in progress (isSubmitting=true), aborting...')
                return
            }

            if (batchSubmit.isPending) {
                console.log('Submit already pending (batchSubmit.isPending=true), aborting...')
                return
            }

            // Prevent rapid successive submissions (< 2 seconds apart)
            if (now - lastSubmissionTime < 2000) {
                console.log('Rapid submission prevented (< 2 seconds since last attempt)')
                toast.warning('Mohon tunggu sebelum mencoba submit lagi')
                return
            }

            // Set submission flag and timestamp immediately
            setIsSubmitting(true)
            setLastSubmissionTime(now)
            console.log('Setting isSubmitting=true to prevent duplicates')

            // PERBAIKAN: Validasi lebih ketat sebelum submit
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

            const unansweredQuestions = organizedQuestions.filter((q: any) =>
                q?.soal?.id && (!answers[q.soal.id] || answers[q.soal.id].trim() === '')
            )

            if (!isAutoSubmit && unansweredQuestions.length > 0) {
                const confirmSubmit = window.confirm(
                    `Masih ada ${unansweredQuestions.length} soal yang tidak dijawab dan akan mendapat skor 0. Yakin ingin mengumpulkan ujian?`
                )
                if (!confirmSubmit) {
                    setIsSubmitting(false) // Reset flag if user cancels
                    return
                }
            }

            console.log('FINAL SUBMIT - This should be the ONLY database submission:', {
                isAutoSubmit,
                totalQuestions: organizedQuestions.length,
                answeredQuestions: organizedQuestions.length - unansweredQuestions.length,
                unansweredQuestions: unansweredQuestions.length,
                ujianId,
                autoSaveDisabled: true,
                onlyFinalSubmit: true,
                timestamp: new Date().toISOString()
            })

            // ENHANCED: Create unique submissions by filtering duplicates at application level
            const uniqueSubmissions = new Map()
            
            submissions = organizedQuestions
                .filter((q: any) => q?.soal?.id)
                .map((q: any) => ({
                    ujian_id: ujianId,
                    soal_id: q.soal.id,
                    answer_text: answers[q.soal.id] || ''
                }))
                .filter((submission) => {
                    // Deduplicate by creating unique key
                    const key = `${submission.ujian_id}-${submission.soal_id}`
                    if (uniqueSubmissions.has(key)) {
                        console.warn('Duplicate submission detected and filtered:', key)
                        return false
                    }
                    uniqueSubmissions.set(key, true)
                    return true
                })

            if (submissions.length === 0) {
                toast.error('Tidak ada jawaban valid untuk dikumpulkan')
                setIsSubmitting(false) // Reset flag on error
                return
            }

            // ENHANCED: Log submission details for debugging
            console.log('Prepared unique submissions:', {
                submissionCount: submissions.length,
                originalCount: organizedQuestions.filter(q => q?.soal?.id).length,
                duplicatesFiltered: organizedQuestions.filter(q => q?.soal?.id).length - submissions.length,
                ujianId,
                soalIds: submissions.map(s => s.soal_id),
                nonEmptyAnswers: submissions.filter(s => s.answer_text.trim() !== '').length,
                emptyAnswers: submissions.filter(s => s.answer_text.trim() === '').length,
                uniqueKeys: Array.from(uniqueSubmissions.keys()),
                timestamp: new Date().toISOString()
            })
            
            // PERBAIKAN: Gunakan try-catch yang lebih spesifik untuk batch submit
            let result
            try {
                result = await batchSubmit.mutateAsync(submissions)
                console.log('Batch submit successful:', result)
            } catch (batchError) {
                console.error('Error in batch submission:', {
                    error: batchError,
                    message: batchError instanceof Error ? batchError.message : 'Unknown error',
                    submissions: submissions.length
                })
                
                // Reset submission flag on error
                setIsSubmitting(false)
                
                // PERBAIKAN: Error message yang lebih informatif
                if (batchError instanceof Error) {
                    if (batchError.message.includes('network')) {
                        toast.error('Gagal menyimpan jawaban: Masalah koneksi internet. Silakan coba lagi.')
                    } else if (batchError.message.includes('authentication')) {
                        toast.error('Gagal menyimpan jawaban: Sesi login telah berakhir. Silakan login kembali.')
                    } else {
                        toast.error(`Gagal menyimpan jawaban: ${batchError.message}`)
                    }
                } else {
                    toast.error('Gagal menyimpan jawaban. Silakan coba lagi.')
                }
                return
            }
                
            // AUTO AI GRADING DISABLED (causes 403 for siswa)
            // AI grading hanya bisa dilakukan oleh GURU dari dashboard
            // if (Array.isArray(result) && result.length > 0) {
            //     console.log('Starting batch AI grading for all answers...')
            //     
            //     try {
            //         await batchAIGrading.mutateAsync({
            //             ujianId,
            //             options: {
            //                 useOptimized: true,
            //                 useBatching: true,
            //                 forceAI: false
            //             }
            //         })
            //         
            //         console.log('Batch AI grading completed successfully')
            //     } catch (aiGradingError) {
            //         console.error('Batch AI grading failed (non-critical):', aiGradingError)
            //         toast.warning('Jawaban tersimpan, tapi penilaian AI mengalami masalah. Akan diproses ulang nanti.')
            //     }
            // }
            
            console.log('Jawaban tersimpan. Menunggu penilaian dari guru.')

            // PERBAIKAN: Update status ujian_siswa dengan error handling
            try {
                await submitUjianSiswaMutation.mutateAsync(ujianId)
                console.log('Status ujian_siswa berhasil diupdate menjadi completed')
            } catch (statusError) {
                console.error('Error updating ujian_siswa status:', statusError)
                // Jangan gagalkan submit karena masalah status update
                toast.warning('Jawaban tersimpan, tapi ada masalah update status ujian')
            }

            // Cleanup localStorage
            try {
                localStorage.removeItem(`ujian_${ujianId}_answers`)
            } catch {
                // Ignore storage errors (private browsing, etc.)
            }

            // SUCCESS: Reset submission flag and mark as submitted
            setIsSubmitting(false)
            setIsSubmitted(true) // Mark as successfully submitted
            onSubmitted?.() // Call callback to notify parent component
            console.log('Setting isSubmitting=false (success)')

            // Tampilkan pesan toast yang informatif tergantung tujuan redirect
            if (ujian?.kelas_id) {
                toast.success(
                    isAutoSubmit
                        ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                        : 'Ujian berhasil dikumpulkan!',
                    {
                        description: 'Anda akan diarahkan ke halaman kelas...'
                    }
                )
            } else {
                toast.success(
                    isAutoSubmit
                        ? 'Waktu habis! Ujian berhasil dikumpulkan otomatis!'
                        : 'Ujian berhasil dikumpulkan!'
                )
            }

            setTimeout(() => {
                // PERBAIKAN: Redirect ke halaman kelas jika ujian terkait dengan kelas tertentu
                if (ujian?.kelas_id) {
                    const kelasUrl = `/siswa/kelas/${ujian.kelas_id}`
                    console.log('Redirecting to kelas page:', {
                        ujianId,
                        kelasId: ujian.kelas_id,
                        ujianName: ujian.name,
                        redirectUrl: kelasUrl
                    })
                    window.location.href = kelasUrl
                } else {
                    console.log('Redirecting to dashboard (no kelas_id):', {
                        ujianId,
                        ujianName: ujian?.name || 'Unknown',
                        kelasId: 'null/undefined',
                        redirectUrl: '/siswa/dashboard'
                    })
                    window.location.href = '/siswa/dashboard'
                }
            }, isAutoSubmit ? 2000 : 1000)

        } catch (error: unknown) {
            // CRITICAL ERROR: Reset submission flag
            setIsSubmitting(false)
            console.log('Setting isSubmitting=false (error)')
            
            console.error('Critical error in handleSubmitAll:', {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                isAutoSubmit,
                submissionsLength: submissions?.length,
                ujianId
            })
            
            // PERBAIKAN: Error handling yang lebih baik
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
    }, [organizedQuestions, answers, batchSubmit, batchAIGrading, submitUjianSiswaMutation, ujianId, ujian?.kelas_id, ujian?.name, onSubmitted]) // PERBAIKAN: Dependency yang lebih spesifik

    // Setup auto submit ref
    useEffect(() => {
        autoSubmitRef.current = () => handleSubmitAll(true)
    }, [handleSubmitAll])

    // Handle force save (for page unload, etc.) - Skip if exam is submitted
    useEffect(() => {
        const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
            // If exam is successfully submitted, allow navigation without warning
            if (isSubmitted) {
                console.log('Exam submitted - allowing navigation without warning')
                return
            }
            
            // Only force submit if exam is not yet submitted
            await forceSubmit()
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
            // Only force submit on cleanup if not submitted
            if (!isSubmitted) {
                forceSubmit()
            }
        }
    }, [forceSubmit, isSubmitted])

    // Handle perubahan jawaban dengan optimized auto-save
    const handleAnswerChange = useCallback((soalId: string, answer: string) => {
        if (!soalId) {
            console.error('No soal ID available')
            return
        }

        // Update local state immediately untuk UI responsiveness
        setAnswers(prev => {
            const updated = { ...prev, [soalId]: answer }
            
            // Save ke localStorage untuk backup (menggunakan updated state)
            try {
                const localKey = `ujian_${ujianId}_answers`
                localStorage.setItem(localKey, JSON.stringify(updated))
            } catch {
                // Ignore storage errors (private browsing, etc.)
            }
            
            return updated
        })

        console.log('Answer changed for soal:', soalId, 'answer', answer, 'triggering auto-save...')
        
        // Trigger optimized auto-save dengan debouncing
        debouncedSubmit({
            ujian_id: ujianId,
            soal_id: soalId,
            answer_text: answer
        })
    }, [ujianId, debouncedSubmit]) // Hapus `answers` dari dependency

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

    // Otomatis mendaftarkan siswa ke ujian_siswa ketika mengakses halaman ujian
    const registerToUjian = useCallback((ujian: any, isRemidi = false) => {
        if (!ujian || !ujianId) return
        
        // Guard untuk mencegah registration berulang
        if (startUjianSiswaMutation.isPending) {
            console.log('Registration sudah dalam proses, skip...')
            return
        }
        
        if (ujian.status === 'active') {
            startUjianSiswaMutation.mutate({ ujianId, isRemidi }, {
                onSuccess: () => {
                    console.log('Siswa berhasil terdaftar untuk ujian:', ujianId, isRemidi ? '(remidi)' : '')
                },
                onError: (error: any) => {
                    if (error.message.includes('sudah terdaftar')) {
                        console.log('Siswa sudah terdaftar untuk ujian:', ujianId)
                    } else {
                        console.error('Error mendaftarkan siswa:', error)
                        toast.error('Gagal mendaftarkan ke ujian: ' + error.message)
                    }
                }
            })
        }
    }, [ujianId, startUjianSiswaMutation])

    // Setup timer ujian dengan optimasi untuk mengurangi re-render
    // studentStartedAt: waktu siswa mulai ujian (dari ujian_siswa.started_at)
    const setupTimer = useCallback((ujian: any, studentStartedAt?: string) => {
        if (!ujian?.duration_minutes) return

        // Gunakan started_at siswa jika tersedia, fallback ke ujian.start_time
        const baseTime = studentStartedAt 
            ? new Date(studentStartedAt) 
            : ujian.start_time 
                ? new Date(ujian.start_time) 
                : new Date()
        
        let endTime = new Date(baseTime.getTime() + ujian.duration_minutes * 60 * 1000)
        
        // Cap dengan ujian.end_time jika ada (tidak boleh melebihi waktu akhir ujian)
        if (ujian.end_time) {
            const examEndTime = new Date(ujian.end_time)
            if (examEndTime < endTime) {
                endTime = examEndTime
            }
        }
        
        let hasAutoSubmitted = false
        let lastNotifiedMinute = -1
        let lastNotifiedSecond = -1

        const updateTimer = () => {
            const now = new Date()
            const remaining = Math.max(0, endTime.getTime() - now.getTime())
            const remainingSeconds = Math.floor(remaining / 1000)

            // Optimasi: Hanya update state jika ada perubahan signifikan
            setTimeLeft(prev => {
                if (prev !== remainingSeconds) {
                    return remainingSeconds
                }
                return prev
            })

            if (remainingSeconds <= 0 && !hasAutoSubmitted) {
                hasAutoSubmitted = true
                console.log('Time is up! Auto-submitting ujian...')

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

            // Optimasi: Warning notifications dengan tracking untuk menghindari spam
            const minutesLeft = Math.floor(remainingSeconds / 60)
            if (remainingSeconds > 0 && remainingSeconds <= 300 && remainingSeconds % 60 === 0) {
                if (lastNotifiedMinute !== minutesLeft) {
                    lastNotifiedMinute = minutesLeft
                    toast.warning(` Sisa waktu: ${minutesLeft} menit!`, {
                        duration: 2000
                    })
                }
            }

            if (remainingSeconds > 0 && remainingSeconds <= 60 && remainingSeconds % 10 === 0) {
                if (lastNotifiedSecond !== remainingSeconds) {
                    lastNotifiedSecond = remainingSeconds
                    toast.error(` Sisa waktu: ${remainingSeconds} detik!`, {
                        duration: 1000
                    })
                }
            }
        }

        updateTimer()
        const interval = setInterval(updateTimer, 1000)

        return () => {
            console.log('Cleaning up timer interval')
            clearInterval(interval)
        }
    }, []) // Dependency array kosong untuk mencegah re-creation

    return {
        currentQuestionIndex,
        setCurrentQuestionIndex,
        answers,
        setAnswers,
        timeLeft,
        navigatorOpen,
        setNavigatorOpen,
        isSubmitting, // NEW: Add isSubmitting state
        isSubmitted, // NEW: Add isSubmitted state
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
