import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'

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
            ? `✅ Benar! Jawaban Anda "${answerText}" adalah tepat.`
            : `❌ Salah. Jawaban Anda "${answerText}" kurang tepat. Jawaban yang benar adalah "${correctText}".`

        const { error: updateError } = await supabase
            .from('jawaban')
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
            .from('jawaban')
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
            .from('jawaban')
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

type Jawaban = Database['public']['Tables']['jawaban']['Row']
type JawabanInsert = Database['public']['Tables']['jawaban']['Insert']
type JawabanUpdate = Database['public']['Tables']['jawaban']['Update']

// Hook untuk mendapatkan jawaban siswa untuk ujian tertentu
export function useJawabanByUjian(ujianId: string) {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['jawaban', 'ujian', ujianId],
        queryFn: async () => {

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            const { data, error } = await supabase
                .from('jawaban')
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
                .order('created_at', { ascending: true })

            if (error) {
                console.error('❌ Error fetching jawaban:', error)
                throw error
            }

            return data || []
        },
        enabled: !!ujianId && !!user?.id,
    })
}

// Hook untuk mendapatkan semua jawaban siswa
export function useJawabanSiswa() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['jawaban', 'siswa'],
        queryFn: async () => {
            console.log('📝 Fetching all jawaban for siswa:', { userId: user?.id })

            if (!user?.id) {
                console.log('❌ User not authenticated for useJawabanSiswa')
                return []
            }

            try {
                const { data, error } = await supabase
                    .from('jawaban')
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

                console.log('✅ Jawaban siswa fetched successfully:', {
                    total: data?.length || 0,
                    sample: data?.[0],
                    ujianData: data?.map(j => ({
                        id: j.id,
                        ujian_id: j.ujian_id,
                        ujianNested: j.ujian,
                        hasUjianData: !!j.ujian
                    }))
                })

                // Filter out answers without valid ujian data
                const validData = data?.filter(jawaban => {
                    if (!jawaban.ujian) {
                        console.warn('⚠️ Found jawaban without ujian data:', {
                            jawabanId: jawaban.id,
                            ujianId: jawaban.ujian_id
                        })
                        return false
                    }
                    return true
                }) || []

                console.log(`📊 Filtered results: ${validData.length}/${data?.length || 0} valid answers`)
                return validData
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
        mutationFn: async (jawaban: Omit<JawabanInsert, 'siswa_id'>) => {
            console.log('📝 Submitting jawaban:', jawaban)

            if (!user?.id) {
                throw new Error('User not authenticated')
            }

            const { data, error } = await supabase
                .from('jawaban')
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

    const submitJawaban = useCallback(async (jawaban: Omit<JawabanInsert, 'siswa_id'>) => {
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
                .from('jawaban')
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

    const debouncedSubmit = useCallback((jawaban: Omit<JawabanInsert, 'siswa_id'>) => {
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
                .from('jawaban')
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
        mutationFn: async ({ id, ...updates }: { id: string } & JawabanUpdate) => {
            console.log('📝 Updating jawaban:', { id, updates })

            const { data, error } = await supabase
                .from('jawaban')
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

// Hook untuk mendapatkan ujian IDs yang sudah dikerjakan siswa (untuk filtering available ujian)
export function useCompletedUjianIds() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'completed', 'ids', 'siswa'],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                const { data: completedIds, error } = await supabase
                    .from('jawaban')
                    .select('ujian_id')
                    .eq('siswa_id', user.id)

                if (error) {
                    console.error('❌ Error fetching completed ujian IDs:', error)
                    throw error
                }

                // Extract unique ujian IDs
                const uniqueIds = [...new Set(completedIds?.map(item => item.ujian_id) || [])]
                return uniqueIds
            } catch (error) {
                console.error('❌ Error in useCompletedUjianIds:', error)
                throw error
            }
        },
        enabled: !!user?.id,
    })
}

// Hook untuk mendapatkan ujian yang telah diikuti siswa
export function useCompletedUjianSiswa() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'completed', 'siswa'],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Ambil semua jawaban siswa
                const { data: simpleJawaban, error: simpleError } = await supabase
                    .from('jawaban')
                    .select('id, ujian_id, siswa_id, score, created_at')
                    .eq('siswa_id', user.id)

                if (simpleError) {
                    console.error('❌ Error fetching jawaban:', simpleError)
                    throw simpleError
                }

                if (!simpleJawaban || simpleJawaban.length === 0) {
                    return []
                }

                // Ambil unique ujian IDs
                const ujianIds = [...new Set(simpleJawaban.map(j => j.ujian_id))]

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

                if (ujianError) {
                    console.error('❌ Error fetching ujian data:', ujianError)
                    throw ujianError
                }

                if (!ujianData || ujianData.length === 0) {
                    return []
                }

                // Gabungkan data jawaban dengan ujian
                const completedUjian = ujianData.map(ujian => {
                    const jawabanForUjian = simpleJawaban.filter(j => j.ujian_id === ujian.id)
                    const scores = jawabanForUjian.filter(j => j.score !== null).map(j => j.score)
                    const averageScore = scores.length > 0
                        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
                        : null

                    // Find latest attempt
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
    })
}

// Hook untuk mendapatkan ujian yang tersedia untuk siswa (belum dikerjakan)
export function useAvailableUjian() {
    const { user } = useAuthStore()
    const { data: completedIds = [] } = useCompletedUjianIds()

    return useQuery({
        queryKey: ['ujian', 'available', completedIds],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Fetch all ujian yang tidak ada di daftar completed
                const query = supabase
                    .from('ujian')
                    .select(`
                        *
                    `)
                    .order('created_at', { ascending: false });

                // Filter out completed ujian if there are any
                if (completedIds.length > 0) {
                    query.not('id', 'in', `(${completedIds.join(',')})`)
                }

                const { data, error } = await query

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
    })
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
