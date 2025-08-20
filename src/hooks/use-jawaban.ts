import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'
import { useNotifications } from './use-notifications'

const supabase = createClient()

// Function to check multiple choice answer automatically
async function checkMultipleChoiceAnswer(jawabanId: string, soalId: string, answer: string) {
    try {
        console.log('🎯 Checking multiple choice answer:', { jawabanId, soalId, answer })

        // Get soal data with options to check correct answer
        const { data: soal, error: soalError } = await supabase
            .from('soal')
            .select('correct_answer, question_type, options')
            .eq('id', soalId)
            .maybeSingle()

        if (soalError || !soal) {
            console.error('❌ Error fetching soal for auto-grading:', soalError)
            return
        }

        // Only process multiple choice questions
        if (soal.question_type !== 'multiple_choice' || !soal.correct_answer) {
            console.log('⏭️ Skipping auto-grading: Not a multiple choice or no correct answer')
            return
        }

        // Check if answer is correct
        const isCorrect = answer === soal.correct_answer
        const score = isCorrect ? 100 : 0

        // Get option text for better feedback
        const answerText = soal.options?.find((opt: any) => opt.id === answer)?.text || answer
        const correctText = soal.options?.find((opt: any) => opt.id === soal.correct_answer)?.text || soal.correct_answer

        console.log('📊 Auto-grading result:', {
            answer,
            answerText,
            correctAnswer: soal.correct_answer,
            correctText,
            isCorrect,
            score
        })

        // Update jawaban with score and auto feedback
        const feedback = isCorrect
            ? `Benar! Jawaban Anda "${answerText}" adalah tepat.`
            : `Salah. Jawaban Anda "${answerText}" kurang tepat. Jawaban yang benar adalah "${correctText}".`

        const { error: updateError } = await supabase
            .from('jawaban_siswa')
            .update({
                score: score,
                ai_feedback: feedback,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', jawabanId)

        if (updateError) {
            console.error('❌ Error updating jawaban with auto-grade:', updateError)
            return
        }

        console.log('✅ Multiple choice auto-graded successfully:', { jawabanId, score, isCorrect })

        // Get siswa_id and ujian_id to calculate final score
        const { data: jawabanData } = await supabase
            .from('jawaban_siswa')
            .select('siswa_id, ujian_id')
            .eq('id', jawabanId)
            .maybeSingle()

        if (jawabanData) {
            // Calculate final ujian score after this grading
            calculateUjianScore(jawabanData.ujian_id, jawabanData.siswa_id)
        }

    } catch (error) {
        console.error('❌ Error in auto-grading multiple choice:', error)
    }
}

// Function to calculate ujian final score
async function calculateUjianScore(ujianId: string, siswaId: string) {
    try {
        console.log('📊 Calculating final ujian score:', { ujianId, siswaId })

        // Get all jawaban for this ujian and siswa
        const { data: allJawaban, error: jawabanError } = await supabase
            .from('jawaban_siswa')
            .select('score, soal_id')
            .eq('ujian_id', ujianId)
            .eq('siswa_id', siswaId)

        if (jawabanError || !allJawaban) {
            console.error('❌ Error fetching jawaban for score calculation:', jawabanError)
            return
        }

        // Calculate average score (only for graded answers)
        const gradedAnswers = allJawaban.filter(j => j.score !== null)

        if (gradedAnswers.length === 0) {
            console.log('⏭️ No graded answers yet, skipping final score calculation')
            return
        }

        const totalScore = gradedAnswers.reduce((sum, j) => sum + (j.score || 0), 0)
        const averageScore = Math.round(totalScore / gradedAnswers.length)

        console.log('📈 Score calculation:', {
            totalAnswers: allJawaban.length,
            gradedAnswers: gradedAnswers.length,
            totalScore,
            averageScore
        })

        // Check if we have graded all answers for this ujian
        const { data: totalSoal, error: soalError } = await supabase
            .from('ujian_soal')
            .select('soal_id')
            .eq('ujian_id', ujianId)

        if (soalError || !totalSoal) {
            console.error('❌ Error fetching total soal:', soalError)
            return
        }

        const allAnswersGraded = gradedAnswers.length >= totalSoal.length

        console.log('🔍 Completion check:', {
            totalSoal: totalSoal.length,
            gradedAnswers: gradedAnswers.length,
            allAnswersGraded
        })

        // If all answers are graded, we can provide final score
        if (allAnswersGraded) {
            // Optionally update ujian status or create result record
            console.log('🎯 All answers graded! Final score:', averageScore)

            // Here you can add logic to update ujian status to 'completed'
            // or create a separate result table entry
        }

    } catch (error) {
        console.error('❌ Error calculating ujian score:', error)
    }
}
async function triggerAIGrading(jawabanId: string, soalId: string) {
    try {
        console.log('🤖 Checking if AI grading needed for jawaban:', jawabanId)

        // Get soal data to check question type
        const { data: soal, error: soalError } = await supabase
            .from('soal')
            .select('question_type')
            .eq('id', soalId)
            .maybeSingle()

        if (soalError || !soal) {
            console.error('❌ Error fetching soal for AI grading check:', soalError)
            return
        }

        // Only trigger AI grading for essay questions
        if (soal.question_type !== 'essay') {
            console.log('⏭️ Skipping AI grading: Not an essay question')
            return
        }

        console.log('🤖 Triggering AI grading for essay question:', jawabanId)

        const response = await fetch('/api/ai-grading', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ jawabanId }),
        })

        if (!response.ok) {
            console.error('❌ AI grading request failed:', response.statusText)
            return
        }

        const result = await response.json()
        console.log('✅ AI grading triggered successfully:', result)
    } catch (error) {
        console.error('❌ Error triggering AI grading:', error)
    }
}

type JawabanSiswa = Database['public']['Tables']['jawaban_siswa']['Row']
type JawabanSiswaInsert = Database['public']['Tables']['jawaban_siswa']['Insert']
type JawabanSiswaUpdate = Database['public']['Tables']['jawaban_siswa']['Update']

// Hook untuk mendapatkan jawaban siswa untuk ujian tertentu (attempt terakhir saja)
export function useJawabanByUjian(ujianId: string) {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['jawaban', 'ujian', ujianId],
        queryFn: async () => {

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            // Ambil semua jawaban untuk ujian ini, diurutkan berdasarkan created_at
            const { data: allJawaban, error } = await supabase
                .from('jawaban_siswa')
                .select(`
                    *,
                    soal:soal_id (
                        id,
                        question_text,
                        question_type,
                        options,
                        correct_answer,
                        difficulty_level,
                        tags
                    )
                `)
                .eq('ujian_id', ujianId)
                .eq('siswa_id', user.id)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('❌ Error fetching jawaban:', error)
                throw error
            }

            if (!allJawaban || allJawaban.length === 0) {
                return []
            }

            // Group by soal_id dan ambil jawaban dari attempt terakhir saja
            const latestAnswersMap = new Map<string, any>()
            allJawaban.forEach((jawaban: any) => {
                const soalId = jawaban.soal_id
                const currentDate = new Date(jawaban.created_at)
                
                if (!latestAnswersMap.has(soalId) || 
                    new Date(latestAnswersMap.get(soalId).created_at) < currentDate) {
                    latestAnswersMap.set(soalId, jawaban)
                }
            })

            // Convert map ke array dan sort berdasarkan soal urutan (jika ada)
            const latestAnswers = Array.from(latestAnswersMap.values())
            
            console.log('🔍 Latest answers for ujian:', {
                ujianId,
                totalAnswers: allJawaban.length,
                latestAnswers: latestAnswers.length,
                soalIds: latestAnswers.map(j => j.soal_id)
            })

            return latestAnswers.sort((a, b) => {
                // Sort by soal_id untuk konsistensi urutan
                return a.soal_id.localeCompare(b.soal_id)
            })
        },
        enabled: !!ujianId && !!user?.id,
    })
}

// Hook untuk mendapatkan semua jawaban siswa (hanya attempt terakhir per ujian)
export function useJawabanSiswa() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['jawaban', 'siswa'],
        queryFn: async () => {
            console.log('📝 Fetching all jawaban for siswa (latest attempts only):', { userId: user?.id })

            if (!user?.id) {
                console.log('❌ User not authenticated for useJawabanSiswa')
                return []
            }

            try {
                // Ambil semua jawaban siswa
                const { data: allJawaban, error } = await supabase
                    .from('jawaban_siswa')
                    .select(`
                        *,
                        ujian (
                            id,
                            name,
                            description,
                            created_by,
                            profiles (full_name)
                        ),
                        soal (
                            id,
                            question_text,
                            question_type
                        )
                    `)
                    .eq('siswa_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('❌ Error fetching jawaban siswa:', error)
                    throw error
                }

                if (!allJawaban || allJawaban.length === 0) {
                    return []
                }

                // Group by ujian_id dan soal_id, ambil hanya attempt terakhir
                const latestAnswersMap = new Map<string, any>()
                allJawaban.forEach((jawaban: any) => {
                    const key = `${jawaban.ujian_id}_${jawaban.soal_id}`
                    const currentDate = new Date(jawaban.created_at)
                    
                    if (!latestAnswersMap.has(key) || 
                        new Date(latestAnswersMap.get(key).created_at) < currentDate) {
                        latestAnswersMap.set(key, jawaban)
                    }
                })

                const latestAnswers = Array.from(latestAnswersMap.values())

                console.log('✅ Jawaban siswa fetched (latest attempts only):', {
                    totalAnswers: allJawaban.length,
                    latestAnswers: latestAnswers.length,
                    uniqueUjian: [...new Set(latestAnswers.map(j => j.ujian_id))].length
                })

                // Filter out answers without valid ujian data
                const validData = latestAnswers.filter((jawaban: any) => {
                    if (!jawaban.ujian) {
                        console.warn('⚠️ Found jawaban without ujian data:', {
                            jawabanId: jawaban.id,
                            ujianId: jawaban.ujian_id
                        })
                        return false
                    }
                    return true
                })

                console.log(`📊 Filtered results: ${validData.length}/${latestAnswers.length} valid answers`)
                return validData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            } catch (error) {
                console.error('❌ Error in useJawabanSiswa query:', error)
                throw error
            }
        },
        enabled: !!user?.id,
    })
}

// Hook untuk submit jawaban
export function useSubmitJawaban() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async (jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
            console.log('📝 Submitting jawaban:', jawaban)

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            const { data, error } = await supabase
                .from('jawaban_siswa')
                .upsert({
                    ...jawaban,
                    siswa_id: user.id,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('❌ Error submitting jawaban:', error)
                throw error
            }

            console.log('✅ Jawaban submitted successfully:', data)
            return data
        },
        onSuccess: (data) => {
            console.log('🎉 useSubmitJawaban onSuccess triggered:', data)

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['jawaban'] })
            queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id] })

            // Auto-grade based on question type
            console.log('🚀 Starting auto-grading process for:', {
                jawabanId: data.id,
                soalId: data.soal_id,
                answer: data.answer_text
            })

            checkMultipleChoiceAnswer(data.id, data.soal_id, data.answer_text)
            triggerAIGrading(data.id, data.soal_id)
        },
    })
}

// Hook untuk auto-save jawaban ke localStorage (hybrid approach)
export function useLocalAutoSave() {
    const saveToLocal = useCallback((ujianId: string, soalId: string, answer: string) => {
        try {
            const key = `ujian_${ujianId}_answers`
            const existing = localStorage.getItem(key)
            const answers = existing ? JSON.parse(existing) : {}

            answers[soalId] = {
                answer_text: answer,
                saved_at: new Date().toISOString()
            }

            localStorage.setItem(key, JSON.stringify(answers))
            console.log('💾 Auto-saved to localStorage:', { soalId, answerLength: answer.length })
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error)
        }
    }, [])

    const loadFromLocal = useCallback((ujianId: string) => {
        try {
            const key = `ujian_${ujianId}_answers`
            const saved = localStorage.getItem(key)
            if (saved) {
                const answers = JSON.parse(saved)
                console.log('📂 Loaded from localStorage:', Object.keys(answers).length, 'answers')
                return answers
            }
        } catch (error) {
            console.error('❌ Error loading from localStorage:', error)
        }
        return {}
    }, [])

    const clearLocal = useCallback((ujianId: string) => {
        try {
            const key = `ujian_${ujianId}_answers`
            localStorage.removeItem(key)
            console.log('🗑️ Cleared localStorage for ujian:', ujianId)
        } catch (error) {
            console.error('❌ Error clearing localStorage:', error)
        }
    }, [])

    return {
        saveToLocal,
        loadFromLocal,
        clearLocal
    }
}

// Hook untuk submit jawaban dengan debouncing (untuk auto-save saat mengetik)
export function useDebouncedSubmitJawaban(delay = 2000) {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const submitJawaban = useCallback(async (jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
        if (!user?.id) {
            console.error('❌ User not authenticated for debounced submit')
            return
        }

        try {
            console.log('💾 Auto-saving jawaban:', {
                soal_id: jawaban.soal_id,
                answer_length: jawaban.answer_text?.length || 0
            })

            const { data, error } = await supabase
                .from('jawaban_siswa')
                .upsert({
                    ...jawaban,
                    siswa_id: user.id,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('❌ Error auto-saving jawaban:', error)
                return
            }

            console.log('✅ Jawaban auto-saved successfully')

            // Invalidate related queries (but don't trigger AI grading for auto-save)
            queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id] })

        } catch (error) {
            console.error('❌ Unexpected error in auto-save:', error)
        }
    }, [user?.id, queryClient])

    const debouncedSubmit = useCallback((jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            submitJawaban(jawaban)
        }, delay)
    }, [submitJawaban, delay])

    // Cleanup timeout on unmount
    const cancelPendingSubmit = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

    return {
        debouncedSubmit,
        cancelPendingSubmit
    }
}

// Hook untuk batch submit semua jawaban sekaligus (final submit)
export function useBatchSubmitJawaban() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async (jawabans: Array<{
            ujian_id: string
            soal_id: string
            answer_text: string
        }>) => {
            console.log('📤 Batch submitting jawaban:', jawabans.length, 'answers')

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            // Prepare data for batch insert/update
            const jawabanData = jawabans.map(jawaban => ({
                ...jawaban,
                siswa_id: user.id,
                updated_at: new Date().toISOString()
            }))

            const { data, error } = await supabase
                .from('jawaban_siswa')
                .upsert(jawabanData)
                .select()

            if (error) {
                console.error('❌ Error batch submitting jawaban:', error)
                throw error
            }

            console.log('✅ Batch submit successful:', data?.length, 'answers saved')
            return data
        },
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['jawaban'] })

            // Auto-grade for all submitted answers
            data?.forEach(jawaban => {
                checkMultipleChoiceAnswer(jawaban.id, jawaban.soal_id, jawaban.answer_text)
                triggerAIGrading(jawaban.id, jawaban.soal_id)
            })

            // Calculate final score once for the ujian (if we have data)
            if (data && data.length > 0) {
                const ujianId = data[0].ujian_id
                const siswaId = data[0].siswa_id

                // Add delay to ensure all individual grading is complete
                setTimeout(() => {
                    calculateUjianScore(ujianId, siswaId)
                }, 2000)
            }
        },
    })
}

// Hook untuk update jawaban (untuk guru menilai)
export function useUpdateJawaban() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & JawabanSiswaUpdate) => {
            console.log('📝 Updating jawaban:', { id, updates })

            const { data, error } = await supabase
                .from('jawaban_siswa')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                console.error('❌ Error updating jawaban:', error)
                throw error
            }

            console.log('✅ Jawaban updated successfully:', data)
            return data
        },
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['jawaban'] })
            queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id] })
        },
    })
}

// Hook untuk mendapatkan ujian IDs yang sudah BENAR-BENAR selesai dikerjakan siswa (berdasarkan attempt terakhir)
export function useCompletedUjianIds() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'completed', 'ids', 'siswa', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Ambil semua jawaban siswa dengan informasi waktu untuk mendapat attempt terakhir
                const { data: jawabanData, error } = await supabase
                    .from('jawaban_siswa')
                    .select('ujian_id, created_at')
                    .eq('siswa_id', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('❌ Error fetching answered ujian IDs:', error)
                    throw error
                }

                // Group by ujian_id dan ambil attempt terakhir saja
                const latestAttempts = new Map()
                jawabanData?.forEach(jawaban => {
                    const ujianId = jawaban.ujian_id
                    const currentDate = new Date(jawaban.created_at)
                    
                    if (!latestAttempts.has(ujianId) || 
                        new Date(latestAttempts.get(ujianId).created_at) < currentDate) {
                        latestAttempts.set(ujianId, jawaban)
                    }
                })
                
                const uniqueIds = Array.from(latestAttempts.keys())
                
                console.log('🔍 Latest answered ujian attempts:', {
                    totalAnswers: jawabanData?.length || 0,
                    uniqueUjian: uniqueIds.length,
                    latestAttempts: uniqueIds
                })
                
                return uniqueIds
            } catch (error) {
                console.error('❌ Error in useCompletedUjianIds:', error)
                throw error
            }
        },
        enabled: !!user?.id,
        staleTime: 30000, // 30 detik untuk mengurangi re-fetch yang tidak perlu
        refetchInterval: false, // Tidak perlu auto-refetch
    })
}

// Hook untuk mendapatkan ujian yang telah SELESAI dikerjakan siswa (untuk tab "Ujian Dikerjakan")
export function useCompletedUjianSiswa() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'completed', 'siswa'],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Ambil semua jawaban siswa dengan informasi waktu
                const { data: allJawaban, error: jawabanError } = await supabase
                    .from('jawaban_siswa')
                    .select('id, ujian_id, siswa_id, score, created_at')
                    .eq('siswa_id', user.id)
                    .order('created_at', { ascending: false })

                if (jawabanError) {
                    console.error('❌ Error fetching jawaban:', jawabanError)
                    throw jawabanError
                }

                if (!allJawaban || allJawaban.length === 0) {
                    return []
                }

                // Group jawaban berdasarkan ujian_id dan ambil hanya attempt terakhir per ujian
                const latestAttemptsMap = new Map<string, any[]>()
                allJawaban.forEach((jawaban: any) => {
                    const ujianId = jawaban.ujian_id
                    if (!latestAttemptsMap.has(ujianId)) {
                        latestAttemptsMap.set(ujianId, [])
                    }
                    latestAttemptsMap.get(ujianId)!.push(jawaban)
                })

                // Untuk setiap ujian, ambil jawaban dari attempt terakhir saja
                const latestAttemptJawaban: any[] = []
                latestAttemptsMap.forEach((jawabans: any[], ujianId: string) => {
                    // Sort by created_at descending dan ambil yang terakhir (terbaru)
                    const sortedJawaban = jawabans.sort((a: any, b: any) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    
                    // Ambil tanggal attempt terakhir
                    const latestAttemptDate = sortedJawaban[0].created_at
                    
                    // Filter jawaban yang memiliki tanggal yang sama dengan attempt terakhir
                    // (untuk handle multiple soal dalam satu attempt)
                    const latestSessionJawaban = sortedJawaban.filter((j: any) => {
                        const diff = new Date(j.created_at).getTime() - new Date(latestAttemptDate).getTime()
                        return Math.abs(diff) < 60000 // dalam rentang 1 menit (satu sesi ujian)
                    })
                    
                    latestAttemptJawaban.push(...latestSessionJawaban)
                })

                // Ambil unique ujian IDs dari attempt terakhir
                const ujianIds = [...new Set(latestAttemptJawaban.map(j => j.ujian_id))]

                // Ambil data ujian untuk IDs tersebut
                const { data: ujianData, error: ujianError } = await supabase
                    .from('ujian')
                    .select(`
                        id,
                        name,
                        description,
                        status,
                        duration_minutes,
                        start_time,
                        end_time,
                        created_by,
                        created_at,
                        profiles!created_by (full_name)
                    `)
                    .in('id', ujianIds)

                console.log('📊 Fetched completed ujian data (latest attempts only):', {
                    totalJawaban: allJawaban.length,
                    latestAttemptJawaban: latestAttemptJawaban.length,
                    uniqueUjianIds: ujianIds.length,
                    ujianData: ujianData?.length || 0
                })

                if (ujianError) {
                    console.error('❌ Error fetching ujian data:', ujianError)
                    throw ujianError
                }

                if (!ujianData || ujianData.length === 0) {
                    return []
                }

                // Gabungkan data jawaban dengan ujian (hanya attempt terakhir)
                const completedUjian = ujianData.map(ujian => {
                    const jawabanForUjian = latestAttemptJawaban.filter(j => j.ujian_id === ujian.id)
                    const scores = jawabanForUjian.filter(j => j.score !== null).map(j => j.score)
                    const averageScore = scores.length > 0
                        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                        : null

                    // Find latest attempt date
                    const lastAttempt = jawabanForUjian
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at

                    return {
                        id: ujian.id,
                        name: ujian.name,
                        description: ujian.description,
                        status: ujian.status,
                        duration_minutes: ujian.duration_minutes,
                        start_time: ujian.start_time,
                        end_time: ujian.end_time,
                        created_by: ujian.created_by,
                        created_at: ujian.created_at,
                        profiles: ujian.profiles,
                        totalAnswers: jawabanForUjian.length,
                        gradedAnswers: scores.length,
                        averageScore,
                        lastAttempt
                    }
                })

                // Sort berdasarkan lastAttempt (terbaru dulu)
                return completedUjian.sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime())
            } catch (error) {
                console.error('❌ Error in useCompletedUjianSiswa:', error)
                throw error
            }
        },
        enabled: !!user?.id,
        staleTime: 30000, // 30 detik untuk mengurangi re-fetch yang tidak perlu
        refetchInterval: false, // Tidak perlu auto-refetch
    })
}

// Hook untuk mendapatkan ujian yang sedang dikerjakan siswa (in-progress)
export function useInProgressUjianSiswa() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'in-progress', 'siswa', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Ambil ujian yang sudah pernah dijawab tapi belum completed
                const { data: jawabanData, error } = await supabase
                    .from('jawaban_siswa')
                    .select(`
                        ujian_id,
                        created_at,
                        ujian!inner (
                            id,
                            name,
                            description,
                            status,
                            duration_minutes,
                            start_time,
                            end_time,
                            created_by,
                            profiles!created_by (full_name)
                        )
                    `)
                    .eq('siswa_id', user.id)
                    .in('ujian.status', ['active', 'draft']) // Hanya ujian yang masih aktif atau draft

                if (error) {
                    console.error('❌ Error fetching in-progress ujian:', error)
                    throw error
                }

                if (!jawabanData || jawabanData.length === 0) {
                    return []
                }

                // Group by ujian dan ambil yang unique
                const ujianMap = new Map()
                jawabanData.forEach(item => {
                    const ujian = item.ujian as any
                    if (!ujianMap.has(ujian.id)) {
                        ujianMap.set(ujian.id, {
                            ...ujian,
                            lastAttempt: item.created_at
                        })
                    } else {
                        // Update dengan attempt terbaru
                        const existing = ujianMap.get(ujian.id)
                        if (new Date(item.created_at) > new Date(existing.lastAttempt)) {
                            ujianMap.set(ujian.id, {
                                ...ujian,
                                lastAttempt: item.created_at
                            })
                        }
                    }
                })

                const result = Array.from(ujianMap.values())
                console.log('📝 In-progress ujian:', result.length)
                return result
            } catch (error) {
                console.error('❌ Error in useInProgressUjianSiswa:', error)
                throw error
            }
        },
        enabled: !!user?.id,
        staleTime: 30000, // 30 detik untuk mengurangi re-fetch yang tidak perlu
        refetchInterval: false, // Tidak perlu auto-refetch
    })
}

// Hook untuk mendapatkan ujian yang tersedia untuk siswa (belum dikerjakan)
export function useAvailableUjian() {
    const { user } = useAuthStore()
    const queryClient = useQueryClient()
    const { showUjianNotification, permission } = useNotifications()

    const query = useQuery({
        queryKey: ['ujian', 'available', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Get ujian IDs yang sudah dikerjakan (attempt terakhir) dengan logika yang sama
                const { data: jawabanData, error: jawabanError } = await supabase
                    .from('jawaban_siswa')
                    .select('ujian_id, created_at')
                    .eq('siswa_id', user.id)
                    .order('created_at', { ascending: false })

                if (jawabanError) {
                    console.error('❌ Error fetching answered ujian:', jawabanError)
                    throw jawabanError
                }

                // Group by ujian_id dan ambil attempt terakhir saja
                const latestAttempts = new Map()
                jawabanData?.forEach((jawaban: any) => {
                    const ujianId = jawaban.ujian_id
                    const currentDate = new Date(jawaban.created_at)
                    
                    if (!latestAttempts.has(ujianId) || 
                        new Date(latestAttempts.get(ujianId).created_at) < currentDate) {
                        latestAttempts.set(ujianId, jawaban)
                    }
                })
                
                const answeredUjianIds = Array.from(latestAttempts.keys())

                // Fetch semua ujian yang belum dikerjakan
                const query = supabase
                    .from('ujian')
                    .select(`
                        *
                    `)
                    .order('created_at', { ascending: false })

                // Filter out ujian yang sudah dikerjakan
                if (answeredUjianIds.length > 0) {
                    query.not('id', 'in', `(${answeredUjianIds.join(',')})`)
                }

                const { data, error } = await query
                console.log('🔍 Fetching available ujian for user:', {
                    totalUjian: data?.length || 0,
                    answeredUjian: answeredUjianIds.length,
                    availableUjian: data?.length || 0
                })

                if (error) {
                    console.error('❌ Error fetching available ujian:', error)
                    throw error
                }

                return data || []
            } catch (error) {
                console.error('❌ Error in useAvailableUjian:', error)
                throw error
            }
        },
        enabled: !!user?.id,
        staleTime: 30000, // 30 detik untuk mengurangi re-fetch yang tidak perlu
        refetchInterval: false, // Tidak perlu auto-refetch karena sudah ada realtime
    })

    // Setup realtime subscription untuk ujian table
    useEffect(() => {
        if (!user?.id) return

        console.log('🔄 Setting up realtime subscription for available ujian (siswa)')
        
        const channel = supabase
            .channel('ujian-available-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ujian',
                },
                (payload) => {
                    console.log('📡 Realtime ujian change detected (available):', payload.eventType, payload.new || payload.old)
                    
                    // Invalidate query untuk update UI
                    queryClient.invalidateQueries({ 
                        queryKey: ['ujian', 'available', user.id] 
                    })
                    
                    // Show notification untuk ujian baru yang dimulai
                    if (payload.eventType === 'UPDATE' && payload.new) {
                        const newData = payload.new as any
                        const oldData = payload.old as any
                        
                        if (oldData?.status === 'draft' && newData?.status === 'active') {
                            console.log('🎯 Ujian baru tersedia:', newData.name)
                            
                            // Show notification jika user sudah memberikan permission
                            if (permission === 'granted') {
                                showUjianNotification(newData.name)
                            }
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            console.log('🔄 Cleaning up available ujian realtime subscription')
            supabase.removeChannel(channel)
        }
    }, [user?.id, queryClient, showUjianNotification, permission])

    return query
}

// Hook untuk mendapatkan detail ujian untuk siswa
export function useUjianForSiswa(ujianId: string) {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'siswa', ujianId],
        queryFn: async () => {

            if (!user?.id) {
                console.log('❌ User not authenticated for useUjianForSiswa')
                throw new Error('User not authenticated')
            }

            try {
                // Step 1: Get ujian basic info
                const { data: ujianData, error: ujianError } = await supabase
                    .from('ujian')
                    .select(`
                        *,
                        profiles (full_name)
                    `)
                    .eq('id', ujianId)
                    .maybeSingle()

                if (ujianError) {
                    console.error('❌ Error fetching ujian basic info:', ujianError)
                    throw ujianError
                }

                if (!ujianData) {
                    console.error('❌ Ujian not found:', ujianId)
                    throw new Error('Ujian tidak ditemukan')
                }

                // Step 2: Get ujian_soal relationships
                const { data: ujianSoalData, error: ujianSoalError } = await supabase
                    .from('ujian_soal')
                    .select('id, soal_id, urutan')
                    .eq('ujian_id', ujianId)
                    .order('urutan', { ascending: true })

                if (ujianSoalError) {
                    console.error('❌ Error fetching ujian_soal:', ujianSoalError)
                    throw ujianSoalError
                }

                // Step 3: Get soal details separately
                let ujianSoalWithSoal: any[] = []
                if (ujianSoalData && ujianSoalData.length > 0) {
                    const soalIds = ujianSoalData.map(us => us.soal_id)
                    console.log('🔍 Fetching soal details for IDs:', soalIds)

                    const { data: soalData, error: soalError } = await supabase
                        .from('soal')
                        .select(`
                            id,
                            question_text,
                            question_type,
                            options,
                            tags
                        `)
                        .in('id', soalIds)

                    if (soalError) {
                        // Continue with null soal data instead of throwing
                        ujianSoalWithSoal = ujianSoalData.map(us => ({ ...us, soal: null }))
                    } else {
                        // Combine ujian_soal with soal data
                        ujianSoalWithSoal = ujianSoalData.map(us => {
                            const soal = soalData?.find(s => s.id === us.soal_id) || null
                            return { ...us, soal }
                        })
                    }
                } else {
                    console.log('No ujian_soal found for this ujian')
                }

                // Combine all data
                const result = {
                    ...ujianData,
                    ujian_soal: ujianSoalWithSoal
                }

                return result
            } catch (error) {
                console.error('Error in useUjianForSiswa query:', error)
                throw error
            }
        },
        enabled: !!ujianId && !!user?.id,
    })
}
