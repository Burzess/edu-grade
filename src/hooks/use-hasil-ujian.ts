import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const supabase = createClient()

// Hook untuk mendapatkan daftar ujian guru dengan statistik
export function useUjianGuru() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'guru', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

            try {
                // Ambil ujian yang dibuat oleh guru
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
                        created_at
                    `)
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })

                if (ujianError) {
                    console.error('❌ Error fetching ujian guru:', ujianError)
                    throw ujianError
                }

                if (!ujianData || ujianData.length === 0) {
                    return []
                }

                // Untuk setiap ujian, hitung statistik
                const ujianWithStats = await Promise.all(
                    ujianData.map(async (ujian) => {
                        // Hitung total soal
                        const { data: soalCount } = await supabase
                            .from('ujian_soal')
                            .select('id', { count: 'exact' })
                            .eq('ujian_id', ujian.id)

                        // Hitung siswa yang sudah mengerjakan (berdasarkan attempt terakhir)
                        const { data: jawabanData } = await supabase
                            .from('jawaban_siswa')
                            .select('siswa_id, created_at')
                            .eq('ujian_id', ujian.id)
                            .order('created_at', { ascending: false })

                        // Group by siswa_id untuk menghitung unique siswa
                        const siswaMap = new Map()
                        jawabanData?.forEach((jawaban: any) => {
                            const siswaId = jawaban.siswa_id
                            const currentDate = new Date(jawaban.created_at)
                            
                            if (!siswaMap.has(siswaId) || 
                                new Date(siswaMap.get(siswaId).created_at) < currentDate) {
                                siswaMap.set(siswaId, jawaban)
                            }
                        })

                        const uniqueSiswa = siswaMap.size

                        // Hitung rata-rata nilai
                        const { data: scoreData } = await supabase
                            .from('jawaban_siswa')
                            .select('score, siswa_id, created_at')
                            .eq('ujian_id', ujian.id)
                            .not('score', 'is', null)

                        // Group by siswa untuk ambil score dari attempt terakhir
                        const siswaScoreMap = new Map()
                        scoreData?.forEach((jawaban: any) => {
                            const siswaId = jawaban.siswa_id
                            const currentDate = new Date(jawaban.created_at)
                            
                            if (!siswaScoreMap.has(siswaId)) {
                                siswaScoreMap.set(siswaId, [])
                            }
                            siswaScoreMap.get(siswaId).push(jawaban)
                        })

                        // Hitung rata-rata per siswa dari attempt terakhir
                        let totalAverage = 0
                        let siswaWithScores = 0

                        siswaScoreMap.forEach((scores, siswaId) => {
                            // Sort by created_at dan ambil yang terbaru
                            const latestScores = scores
                                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .filter((s: any, index: number, arr: any[]) => {
                                    // Ambil jawaban dalam rentang 1 menit dari attempt terakhir
                                    const latestDate = new Date(arr[0].created_at)
                                    const currentDate = new Date(s.created_at)
                                    return Math.abs(latestDate.getTime() - currentDate.getTime()) < 60000
                                })

                            if (latestScores.length > 0) {
                                const siswaAverage = latestScores.reduce((sum: number, s: any) => sum + s.score, 0) / latestScores.length
                                totalAverage += siswaAverage
                                siswaWithScores++
                            }
                        })

                        const overallAverage = siswaWithScores > 0 ? Math.round(totalAverage / siswaWithScores) : null

                        return {
                            ...ujian,
                            totalSoal: soalCount?.length || 0,
                            totalSiswa: uniqueSiswa,
                            averageScore: overallAverage
                        }
                    })
                )

                return ujianWithStats
            } catch (error) {
                console.error('❌ Error in useUjianGuru:', error)
                throw error
            }
        },
        enabled: !!user?.id,
        staleTime: 60000, // 1 menit
        refetchInterval: false,
    })
}

// Hook untuk mendapatkan detail hasil ujian siswa untuk satu ujian
export function useHasilUjianDetail(ujianId: string) {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['hasil', 'ujian', ujianId],
        queryFn: async () => {
            if (!user?.id || !ujianId) {
                return null
            }

            try {
                // SECURITY FIX: Pastikan ujian ini milik guru yang sedang login
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
                        created_at,
                        created_by
                    `)
                    .eq('id', ujianId)
                    .eq('created_by', user.id) // ✅ CRITICAL: Hanya ujian milik guru ini
                    .maybeSingle()

                if (ujianError || !ujianData) {
                    console.error('❌ Error fetching ujian detail atau ujian bukan milik guru ini:', ujianError)
                    throw new Error('Ujian tidak ditemukan atau Anda tidak memiliki akses')
                }

                // Ambil semua jawaban siswa untuk ujian ini
                const { data: allJawaban, error: jawabanError } = await supabase
                    .from('jawaban_siswa')
                    .select(`
                        id,
                        siswa_id,
                        soal_id,
                        answer_text,
                        score,
                        ai_feedback,
                        created_at,
                        profiles!siswa_id (
                            id,
                            full_name,
                            email
                        ),
                        soal:soal_id (
                            id,
                            question_text,
                            question_type,
                            options,
                            correct_answer
                        )
                    `)
                    .eq('ujian_id', ujianId)
                    .order('created_at', { ascending: false })

                if (jawabanError) {
                    console.error('❌ Error fetching jawaban detail:', jawabanError)
                    throw jawabanError
                }

                if (!allJawaban || allJawaban.length === 0) {
                    return {
                        ujian: ujianData,
                        siswaResults: []
                    }
                }

                // Group by siswa dan ambil attempt terakhir
                const siswaMap = new Map()
                allJawaban.forEach((jawaban: any) => {
                    const siswaId = jawaban.siswa_id
                    if (!siswaMap.has(siswaId)) {
                        siswaMap.set(siswaId, [])
                    }
                    siswaMap.get(siswaId).push(jawaban)
                })

                // Process setiap siswa
                const siswaResults = Array.from(siswaMap.entries()).map(([siswaId, jawabans]: [string, any[]]) => {
                    // Sort by created_at dan ambil attempt terakhir
                    const sortedJawaban = jawabans.sort((a, b) => 
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                    
                    // Ambil tanggal attempt terakhir
                    const latestAttemptDate = sortedJawaban[0].created_at
                    
                    // Filter jawaban dari attempt terakhir (dalam rentang 1 menit)
                    const latestAttemptJawaban = sortedJawaban.filter((j: any) => {
                        const diff = new Date(j.created_at).getTime() - new Date(latestAttemptDate).getTime()
                        return Math.abs(diff) < 60000
                    })

                    // Hitung statistik siswa
                    const scores = latestAttemptJawaban.filter((j: any) => j.score !== null).map((j: any) => j.score)
                    const averageScore = scores.length > 0 
                        ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length)
                        : null

                    const siswaInfo = latestAttemptJawaban[0]?.profiles

                    return {
                        siswa: {
                            id: siswaId,
                            full_name: siswaInfo?.full_name || 'Unknown',
                            email: siswaInfo?.email || 'unknown@email.com'
                        },
                        totalJawaban: latestAttemptJawaban.length,
                        jawabanDinilai: scores.length,
                        averageScore,
                        lastAttempt: latestAttemptDate,
                        jawaban: latestAttemptJawaban.map((j: any) => ({
                            id: j.id,
                            soal_id: j.soal_id,
                            answer_text: j.answer_text,
                            score: j.score,
                            ai_feedback: j.ai_feedback,
                            created_at: j.created_at,
                            soal: j.soal
                        }))
                    }
                })

                // Sort berdasarkan average score (tertinggi dulu)
                siswaResults.sort((a, b) => {
                    if (a.averageScore === null && b.averageScore === null) return 0
                    if (a.averageScore === null) return 1
                    if (b.averageScore === null) return -1
                    return b.averageScore - a.averageScore
                })

                return {
                    ujian: ujianData,
                    siswaResults
                }
            } catch (error) {
                console.error('❌ Error in useHasilUjianDetail:', error)
                throw error
            }
        },
        enabled: !!user?.id && !!ujianId,
        staleTime: 30000,
        refetchInterval: false,
    })
}

// Hook untuk update score jawaban siswa (manual grading)
export function useUpdateScore() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ jawabanId, score, feedback }: { 
            jawabanId: string
            score: number
            feedback?: string 
        }) => {
            console.log('📝 Updating score:', { jawabanId, score, feedback })

            const { data, error } = await supabase
                .from('jawaban_siswa')
                .update({
                    score,
                    ai_feedback: feedback || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jawabanId)
                .select()
                .single()

            if (error) {
                console.error('❌ Error updating score:', error)
                throw error
            }

            console.log('✅ Score updated successfully:', data)
            return data
        },
        onSuccess: (data) => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: ['hasil'] })
            queryClient.invalidateQueries({ queryKey: ['jawaban'] })
        },
    })
}
