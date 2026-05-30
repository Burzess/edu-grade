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
    let ujianQuery = supabase
      .from('ujian')
      .select('id, name, description, created_by, kelas_id, allow_remidi, max_attempts')
      .in('id', ujianIds)

    if (kelasId) {
      ujianQuery = ujianQuery.eq('kelas_id', kelasId)
    }

    // Parallelize independent queries
    const [ujianResult, scoresResult, ujianSiswaResult] = await Promise.all([
      ujianQuery,
      ujianIds.length > 0
        ? supabase
            .from('jawaban_siswa')
            .select('ujian_id, score, ai_feedback, attempt_number')
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
    ])

    const { data: ujianData, error: ujianError } = ujianResult

    if (ujianError) {
      return NextResponse.json({
        success: false,
        error: 'Gagal mengambil data detail ujian'
      }, { status: 500 })
    }

    const scoresData: { ujian_id: string; score: number | null; ai_feedback: string | null; attempt_number: number | null }[] = scoresResult.data || []
    const ujianSiswaData: { ujian_id: string; attempt_number: number; status: string; submitted_at: string }[] = ujianSiswaResult.data || []

    // Get guru names for ujian (depends on ujianData)
    const guruIds = [...new Set((ujianData || []).map(ujian => ujian.created_by).filter(Boolean))]
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
        
        if (attemptCount > 1) {
          // Multiple attempts - calculate per attempt
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
          }
        }

        // Overall score calculation
        const gradedAnswers = ujianScores.filter(s => s.score !== null && s.score !== undefined).length
        const totalAnswers = ujianScores.length

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

        const guru = guruData.find(g => g.id === ujianDetail.created_by)

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
          can_remidi: ujianDetail.allow_remidi && attemptCount < (ujianDetail.max_attempts || 1),
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

  } catch (_error: unknown) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan pada server' 
      },
      { status: 500 }
    )
  }
}
