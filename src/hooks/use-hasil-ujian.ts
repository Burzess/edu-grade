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
                    .or(`created_by.eq.${user.id},guru_id.eq.${user.id}`)
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
                    .select('ujian_id, siswa_id, score, created_at, attempt_number')
                    .in('ujian_id', ujianIds)
                    .order('created_at', { ascending: false })

                // Client-side aggregation: count soal per ujian
                const soalCountByUjian = new Map<string, number>()
                allSoalData?.forEach((soal: { ujian_id: string }) => {
                    soalCountByUjian.set(soal.ujian_id, (soalCountByUjian.get(soal.ujian_id) || 0) + 1)
                })

                // Client-side aggregation: group jawaban by ujian_id
                const jawabanByUjian = new Map<string, Array<{ siswa_id: string; score: number | null; created_at: string; attempt_number?: number }>>()
                allJawabanData?.forEach((jawaban: any) => {
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

                    // Compute average score from highest scoring attempt per siswa
                    const siswaScoreMap = new Map<string, Array<{ score: number | null; created_at: string; attempt_number?: number }>>()
                    jawabanForUjian.forEach(jawaban => {
                        if (!siswaScoreMap.has(jawaban.siswa_id)) {
                            siswaScoreMap.set(jawaban.siswa_id, [])
                        }
                        siswaScoreMap.get(jawaban.siswa_id)!.push(jawaban)
                    })

                    let totalAverage = 0
                    let siswaWithScores = 0

                    siswaScoreMap.forEach((scores) => {
                        const attemptsMap = new Map<number, typeof scores>()
                        scores.forEach((s) => {
                            const att = s.attempt_number || 1
                            if (!attemptsMap.has(att)) attemptsMap.set(att, [])
                            attemptsMap.get(att)!.push(s)
                        })

                        let bestAttemptScore: number | null = null
                        attemptsMap.forEach((attemptItems) => {
                            const validScores = attemptItems.filter(s => s.score !== null).map(s => s.score as number)
                            if (validScores.length > 0) {
                                const attemptAvg = validScores.reduce((sum, s) => sum + s, 0) / validScores.length
                                if (bestAttemptScore === null || attemptAvg > bestAttemptScore) {
                                    bestAttemptScore = attemptAvg
                                }
                            }
                        })

                        if (bestAttemptScore !== null) {
                            totalAverage += bestAttemptScore
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
                        created_by,
                        ujian_kelas(kelas_id)
                    `)
                    .eq('id', ujianId)
                    .or(`created_by.eq.${user.id},guru_id.eq.${user.id}`) // ✅ CRITICAL: Ujian milik guru ini atau di-assign kepadanya
                    .maybeSingle()

                if (ujianError || !ujianData) {
                    throw new Error('Ujian tidak ditemukan atau Anda tidak memiliki akses')
                }

                // Ambil semua soal untuk ujian ini
                const { data: allSoalData } = await supabase
                    .from('ujian_soal')
                    .select(`
                        id,
                        question_text,
                        question_type,
                        options,
                        correct_answer
                    `)
                    .eq('ujian_id', ujianId)

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
                        attempt_number,
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

                const siswaMap = new Map()
                if (allJawaban) {
                    allJawaban.forEach((jawaban: any) => {
                        const siswaId = jawaban.siswa_id
                        if (!siswaMap.has(siswaId)) {
                            siswaMap.set(siswaId, { jawabans: [], profile: jawaban.profiles })
                        }
                        siswaMap.get(siswaId).jawabans.push(jawaban)
                    })
                }

                // Add students from assigned classes who haven't taken the exam
                if (ujianData.ujian_kelas && ujianData.ujian_kelas.length > 0) {
                    const kelasIds = ujianData.ujian_kelas.map((uk: any) => uk.kelas_id)
                    const { data: membersData } = await supabase
                        .from('kelas_members')
                        .select(`
                            siswa_id,
                            profiles!siswa_id (
                                id,
                                full_name,
                                email
                            )
                        `)
                        .in('kelas_id', kelasIds)
                    
                    if (membersData) {
                        membersData.forEach((member: any) => {
                            if (!siswaMap.has(member.siswa_id)) {
                                siswaMap.set(member.siswa_id, { jawabans: [], profile: member.profiles })
                            }
                        })
                    }
                }

                // Process setiap siswa
                const siswaResults = Array.from(siswaMap.entries()).map(([siswaId, data]: [string, any]) => {
                    const { jawabans, profile } = data

                    if (!jawabans || jawabans.length === 0) {
                        return {
                            siswa: {
                                id: siswaId,
                                full_name: profile?.full_name || 'Unknown',
                                email: profile?.email || 'unknown@email.com'
                            },
                            status: 'Belum Mengerjakan',
                            totalJawaban: 0,
                            jawabanDinilai: 0,
                            averageScore: null,
                            lastAttempt: null,
                            jawaban: []
                        }
                    }

                    // Group by attempt_number and pick the attempt with the highest average score (Remidi policy)
                    const attemptsMap = new Map<number, any[]>()
                    jawabans.forEach((j: any) => {
                        const att = j.attempt_number || 1
                        if (!attemptsMap.has(att)) attemptsMap.set(att, [])
                        attemptsMap.get(att)!.push(j)
                    })

                    let bestAttemptJawaban = jawabans
                    if (attemptsMap.size > 1) {
                        let highestAvg = -1
                        attemptsMap.forEach((items) => {
                            const scoredItems = items.filter((j: any) => j.score !== null && j.score !== undefined)
                            const avg = scoredItems.length > 0
                                ? scoredItems.reduce((sum: number, j: any) => sum + (j.score ?? 0), 0) / scoredItems.length
                                : 0
                            if (avg >= highestAvg) {
                                highestAvg = avg
                                bestAttemptJawaban = items
                            }
                        })
                    } else if (attemptsMap.size === 1) {
                        bestAttemptJawaban = Array.from(attemptsMap.values())[0]
                    }

                    const bestAttemptDate = bestAttemptJawaban[0]?.created_at || jawabans[0].created_at

                    // Tambahkan soal yang tidak dijawab
                    const answeredSoalIds = new Set(bestAttemptJawaban.map((j: any) => j.soal_id))
                    const unansweredSoal = allSoalData?.filter((s: any) => !answeredSoalIds.has(s.id)) || []
                    
                    const unansweredJawaban = unansweredSoal.map((s: any) => ({
                        id: `unanswered-${s.id}-${siswaId}`,
                        soal_id: s.id,
                        answer_text: null,
                        score: 0,
                        ai_feedback: 'Tidak dijawab',
                        created_at: bestAttemptDate,
                        soal: s,
                        is_unanswered: true
                    }))

                    const combinedJawaban = [...bestAttemptJawaban, ...unansweredJawaban]

                    // Hitung statistik siswa (hanya dari yang benar-benar dijawab dan dinilai)
                    const scores = bestAttemptJawaban.filter((j: any) => j.score !== null).map((j: any) => j.score)
                    const averageScore = scores.length > 0 
                        ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length)
                        : null

                    return {
                        siswa: {
                            id: siswaId,
                            full_name: profile?.full_name || 'Unknown',
                            email: profile?.email || 'unknown@email.com'
                        },
                        status: 'Sudah Mengerjakan',
                        totalJawaban: bestAttemptJawaban.length, // Hanya hitung yang dijawab
                        jawabanDinilai: scores.length,
                        averageScore,
                        lastAttempt: bestAttemptDate,
                        jawaban: combinedJawaban.map((j: any) => ({
                            id: j.id,
                            soal_id: j.soal_id,
                            answer_text: j.answer_text,
                            score: j.score,
                            ai_feedback: j.ai_feedback,
                            created_at: j.created_at,
                            soal: j.soal,
                            is_unanswered: j.is_unanswered || false
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
