import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const supabase = createClient()

// Hook untuk mendapatkan daftar ujian guru dengan statistik
// Uses single-query aggregation to avoid N+1 client-side queries (bug 1.24)
export function useUjianGuru() {
    const { user } = useAuthStore()

    return useQuery({
        queryKey: ['ujian', 'guru', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return []
            }

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
                    throw ujianError
                }

                if (!ujianData || ujianData.length === 0) {
                    return []
                }

                const ujianIds = ujianData.map(u => u.id)

                // Single query: fetch all soal counts for all ujian at once
                const { data: allSoalData } = await supabase
                    .from('ujian_soal')
                    .select('ujian_id')
                    .in('ujian_id', ujianIds)

                // Single query: fetch all jawaban for all ujian at once (with scores)
                const { data: allJawabanData } = await supabase
                    .from('jawaban_siswa')
                    .select('ujian_id, siswa_id, score, created_at')
                    .in('ujian_id', ujianIds)
                    .order('created_at', { ascending: false })

                // Client-side aggregation: count soal per ujian
                const soalCountByUjian = new Map<string, number>()
                allSoalData?.forEach((soal: { ujian_id: string }) => {
                    soalCountByUjian.set(soal.ujian_id, (soalCountByUjian.get(soal.ujian_id) || 0) + 1)
                })

                // Client-side aggregation: group jawaban by ujian_id
                const jawabanByUjian = new Map<string, Array<{ siswa_id: string; score: number | null; created_at: string }>>()
                allJawabanData?.forEach((jawaban: { ujian_id: string; siswa_id: string; score: number | null; created_at: string }) => {
                    if (!jawabanByUjian.has(jawaban.ujian_id)) {
                        jawabanByUjian.set(jawaban.ujian_id, [])
                    }
                    jawabanByUjian.get(jawaban.ujian_id)!.push(jawaban)
                })

                // Compute statistics per ujian from the aggregated data
                const ujianWithStats = ujianData.map((ujian) => {
                    const totalSoal = soalCountByUjian.get(ujian.id) || 0
                    const jawabanForUjian = jawabanByUjian.get(ujian.id) || []

                    // Count unique siswa
                    const siswaSet = new Set<string>()
                    jawabanForUjian.forEach(j => siswaSet.add(j.siswa_id))
                    const totalSiswa = siswaSet.size

                    // Compute average score from latest attempt per siswa
                    const siswaScoreMap = new Map<string, Array<{ score: number | null; created_at: string }>>()
                    jawabanForUjian.forEach(jawaban => {
                        if (!siswaScoreMap.has(jawaban.siswa_id)) {
                            siswaScoreMap.set(jawaban.siswa_id, [])
                        }
                        siswaScoreMap.get(jawaban.siswa_id)!.push(jawaban)
                    })

                    let totalAverage = 0
                    let siswaWithScores = 0

                    siswaScoreMap.forEach((scores) => {
                        // Sort by created_at descending and filter to latest attempt window
                        const sorted = scores
                            .filter(s => s.score !== null)
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

                        if (sorted.length === 0) return

                        // Ambil jawaban dalam rentang 1 menit dari attempt terakhir
                        const latestDate = new Date(sorted[0].created_at)
                        const latestScores = sorted.filter(s => {
                            const currentDate = new Date(s.created_at)
                            return Math.abs(latestDate.getTime() - currentDate.getTime()) < 60000
                        })

                        if (latestScores.length > 0) {
                            const siswaAverage = latestScores.reduce((sum, s) => sum + (s.score as number), 0) / latestScores.length
                            totalAverage += siswaAverage
                            siswaWithScores++
                        }
                    })

                    const averageScore = siswaWithScores > 0 ? Math.round(totalAverage / siswaWithScores) : null

                    return {
                        ...ujian,
                        totalSoal,
                        totalSiswa,
                        averageScore
                    }
                })

                return ujianWithStats
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
            // Validasi input
            if (!jawabanId) {
                throw new Error('ID jawaban tidak boleh kosong')
            }
            
            if (score < 0 || score > 100) {
                throw new Error('Score harus antara 0-100')
            }

            // Cek dulu apakah jawaban ada
            const { data: existingData, error: checkError } = await supabase
                .from('jawaban_siswa')
                .select('id, ujian_id, siswa_id, soal_id')
                .eq('id', jawabanId)
                .maybeSingle()

            if (checkError) {
                throw new Error(`Error saat cek jawaban: ${checkError.message}`)
            }

            if (!existingData) {
                throw new Error(`Jawaban dengan ID ${jawabanId} tidak ditemukan`)
            }

            // Update score
            const { data, error } = await supabase
                .from('jawaban_siswa')
                .update({
                    score,
                    ai_feedback: feedback || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', jawabanId)
                .select()

            if (error) {
                throw new Error(`Gagal update score: ${error.message}`)
            }

            if (!data || data.length === 0) {
                throw new Error('Update score tidak berhasil - tidak ada data yang berubah')
            }

            return data[0]
        },
        onSuccess: () => {
            // Invalidate related queries untuk refresh UI
            queryClient.invalidateQueries({ queryKey: ['hasil'] })
            queryClient.invalidateQueries({ queryKey: ['jawaban'] })
            queryClient.invalidateQueries({ queryKey: ['ujian'] })
        },
    })
}
