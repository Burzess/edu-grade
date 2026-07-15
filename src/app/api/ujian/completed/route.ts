import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const kelasId = searchParams.get('kelasId')
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tidak terautentikasi' 
      }, { status: 401 })
    }

    // Parallelize independent queries
    const [profileResult, completedResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single(),
      supabase
        .from('jawaban_siswa')
        .select('ujian_id, created_at')
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    // Check if user is siswa
    if (profileResult.data?.role !== 'siswa') {
      return NextResponse.json({
        success: false,
        error: 'Hanya siswa yang dapat mengakses endpoint ini'
      }, { status: 403 })
    }

    const { data: completedData, error: completedError } = completedResult

    if (completedError) {
      console.error('[ujian/completed] completedError:', completedError)
      return NextResponse.json({
        success: false,
        error: 'Gagal mengambil data ujian yang telah selesai'
      }, { status: 500 })
    }

    if (!completedData || completedData.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Get ujian details
    const ujianIds = [...new Set(completedData.map(j => j.ujian_id))]

    // Build ujian query with optional kelas filter
    let selectQuery = 'id, name, description, created_by, guru_id, allow_remidi, max_attempts'
    if (kelasId) {
      selectQuery += ', ujian_kelas!inner(kelas_id)'
    }

    let ujianQuery = supabase
      .from('ujian')
      .select(selectQuery)
      .in('id', ujianIds)

    if (kelasId) {
      ujianQuery = ujianQuery.eq('ujian_kelas.kelas_id', kelasId)
    }

    // Parallelize independent queries
    const [ujianResult, scoresResult, ujianSiswaResult, ujianSoalResult] = await Promise.all([
      ujianQuery,
      ujianIds.length > 0
        ? supabase
            .from('jawaban_siswa')
            .select('ujian_id, soal_id, score, ai_feedback, attempt_number, created_at')
            .eq('siswa_id', user.id)
            .in('ujian_id', ujianIds)
        : Promise.resolve({ data: null }),
      ujianIds.length > 0
        ? supabase
            .from('ujian_siswa')
            .select('ujian_id, attempt_number, status, submitted_at')
            .eq('siswa_id', user.id)
            .in('ujian_id', ujianIds)
            .eq('status', 'completed')
            .order('attempt_number', { ascending: true })
        : Promise.resolve({ data: null }),
      ujianIds.length > 0
        ? supabase
            .from('ujian_soal')
            .select('ujian_id, soal_id')
            .in('ujian_id', ujianIds)
        : Promise.resolve({ data: null }),
    ])

    const ujianData = ujianResult.data as any[] | null;
    const ujianError = ujianResult.error;

    if (ujianError) {
      console.error('[ujian/completed] ujianError:', ujianError)
      return NextResponse.json({
        success: false,
        error: 'Gagal mengambil data detail ujian'
      }, { status: 500 })
    }

    const scoresData: { ujian_id: string; soal_id?: string; score: number | null; ai_feedback: string | null; attempt_number: number | null; created_at?: string }[] = scoresResult.data || []
    const ujianSiswaData: { ujian_id: string; attempt_number: number; status: string; submitted_at: string }[] = ujianSiswaResult.data || []
    const ujianSoalData: { ujian_id: string; soal_id: string }[] = ujianSoalResult.data || []
    const soalCountMap = new Map<string, number>()
    ujianSoalData.forEach(item => {
      soalCountMap.set(item.ujian_id, (soalCountMap.get(item.ujian_id) || 0) + 1)
    })

    // Get guru names for ujian (depends on ujianData)
    const guruIds = [...new Set((ujianData || []).map(ujian => ujian.guru_id || ujian.created_by).filter(Boolean))]
    let guruData: { id: string; full_name: string | null }[] = []
    
    if (guruIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', guruIds)
      
      guruData = profiles || []
    }

    // Process completed ujian with scores (support multiple attempts)
    const completedUjian = (completedData || [])
      .map((item: Record<string, unknown>) => {
        const ujianDetail = ujianData?.find(u => u.id === item.ujian_id)
        if (!ujianDetail) return null

        const ujianScores = scoresData.filter(s => s.ujian_id === item.ujian_id)
        const attempts = ujianSiswaData.filter(us => us.ujian_id === item.ujian_id)
        const attemptCount = attempts.length || 1

        // Calculate score per attempt
        const attemptScores: { attempt: number; score: number | null; date: string }[] = []
        let bestAttemptNum = attempts[attempts.length - 1]?.attempt_number || 1
        
        if (attemptCount > 1) {
          // Multiple attempts - calculate per attempt
          let maxScore = -1
          for (const attempt of attempts) {
            const attemptAnswers = ujianScores.filter(s => 
              (s.attempt_number || 1) === attempt.attempt_number
            )
            const gradedInAttempt = attemptAnswers.filter(s => s.score !== null && s.score !== undefined)
            const avgScore = gradedInAttempt.length > 0
              ? Math.round(gradedInAttempt.reduce((acc: number, s: { score: number | null }) => acc + (s.score ?? 0), 0) / gradedInAttempt.length)
              : null
            attemptScores.push({
              attempt: attempt.attempt_number,
              score: avgScore,
              date: attempt.submitted_at
            })
            if (avgScore !== null && avgScore >= maxScore) {
              maxScore = avgScore
              bestAttemptNum = attempt.attempt_number
            }
          }
        } else if (attempts.length === 1) {
          bestAttemptNum = attempts[0].attempt_number
        }

        // Filter answers for the best (or only/latest) attempt and deduplicate by soal_id
        const bestAttemptAnswersRaw = ujianScores.filter(s => (s.attempt_number || 1) === bestAttemptNum)
        const bestAttemptAnswersMap = new Map<string, typeof ujianScores[0]>()
        bestAttemptAnswersRaw.forEach(s => {
          if (s.soal_id) {
            const existing = bestAttemptAnswersMap.get(s.soal_id)
            if (!existing || new Date(s.created_at || 0) > new Date(existing.created_at || 0)) {
              bestAttemptAnswersMap.set(s.soal_id, s)
            }
          }
        })
        const bestAttemptAnswers = bestAttemptAnswersMap.size > 0 
          ? Array.from(bestAttemptAnswersMap.values())
          : bestAttemptAnswersRaw

        // Overall score calculation (for best attempt only, bounded by unique questions)
        const gradedAnswers = bestAttemptAnswers.filter(s => s.score !== null && s.score !== undefined).length
        const totalAnswers = soalCountMap.get(item.ujian_id as string) || bestAttemptAnswers.length

        // For remidi exams, take the best score across attempts
        let bestScore: number | null
        let averageScore: number | null

        if (attemptScores.length > 0) {
          const validScores = attemptScores.filter(a => a.score !== null)
          bestScore = validScores.length > 0 ? Math.max(...validScores.map(a => a.score!)) : null
          averageScore = bestScore // For remidi, display the best score
        } else {
          // Single attempt (backward compatible)
          averageScore = gradedAnswers > 0 
            ? Math.round(
                ujianScores
                  .filter(s => s.score !== null && s.score !== undefined)
                  .reduce((acc: number, s: { score: number | null }) => acc + (s.score ?? 0), 0) / gradedAnswers
              )
            : null
          bestScore = averageScore
        }

        const guru = guruData.find(g => g.id === (ujianDetail.guru_id || ujianDetail.created_by))

        return {
          id: ujianDetail.id,
          name: ujianDetail.name,
          description: ujianDetail.description,
          guru_name: guru?.full_name || 'Tidak diketahui',
          lastAttempt: item.created_at,
          averageScore: bestScore ?? averageScore,
          gradedAnswers,
          totalAnswers,
          // Remidi info
          allow_remidi: ujianDetail.allow_remidi || false,
          max_attempts: ujianDetail.max_attempts || 1,
          attempt_count: attemptCount,
          attempt_scores: attemptScores,
          can_remidi: ujianDetail.allow_remidi && (ujianDetail.max_attempts === 0 || attemptCount < (ujianDetail.max_attempts || 1)),
        }
      })
      .filter(Boolean)
      // Remove duplicates by ujian_id
      .filter((ujian, index, self) => 
        index === self.findIndex(u => u?.id === ujian?.id)
      )

    return NextResponse.json({
      success: true,
      data: completedUjian
    })

  } catch (error: unknown) {
    console.error('[ujian/completed] Unhandled error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan pada server' 
      },
      { status: 500 }
    )
  }
}
