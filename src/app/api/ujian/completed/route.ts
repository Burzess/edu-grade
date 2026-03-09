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
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Check if user is siswa
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'siswa') {
      return NextResponse.json({
        success: false,
        error: 'Only siswa can access this endpoint'
      }, { status: 403 })
    }

    // Get completed ujian for this siswa
    let query = supabase
      .from('jawaban_siswa')
      .select('ujian_id, created_at')
      .eq('siswa_id', user.id)

    const { data: completedData, error: completedError } = await query
      .order('created_at', { ascending: false })

    if (completedError) {
      console.error('Error fetching completed ujian:', completedError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch completed ujian'
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
    let ujianQuery = supabase
      .from('ujian')
      .select('id, name, description, created_by, kelas_id, allow_remidi, max_attempts')
      .in('id', ujianIds)

    // Filter by kelas_id if provided
    if (kelasId) {
      ujianQuery = ujianQuery.eq('kelas_id', kelasId)
    }

    const { data: ujianData, error: ujianError } = await ujianQuery

    if (ujianError) {
      console.error('Error fetching ujian details:', ujianError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ujian details'
      }, { status: 500 })
    }

    // Get scores for completed ujian (include attempt_number)
    let scoresData: { ujian_id: string; score: number | null; ai_feedback: string | null; attempt_number: number | null }[] = []

    if (ujianIds.length > 0) {
      const { data: scores } = await supabase
        .from('jawaban_siswa')
        .select(`
          ujian_id,
          score,
          ai_feedback,
          attempt_number
        `)
        .eq('siswa_id', user.id)
        .in('ujian_id', ujianIds)
    
      scoresData = scores || []
    }

    // Get ujian_siswa records for attempt info
    let ujianSiswaData: { ujian_id: string; attempt_number: number; status: string; submitted_at: string }[] = []
    if (ujianIds.length > 0) {
      const { data: ujianSiswa } = await supabase
        .from('ujian_siswa')
        .select('ujian_id, attempt_number, status, submitted_at')
        .eq('siswa_id', user.id)
        .in('ujian_id', ujianIds)
        .eq('status', 'completed')
        .order('attempt_number', { ascending: true })
      
      ujianSiswaData = ujianSiswa || []
    }

    // Get guru names for ujian
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
        let bestScore: number | null = null
        let averageScore: number | null = null

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
      .filter((ujian: Record<string, unknown>, index: number, self: Record<string, unknown>[]) => 
        index === self.findIndex(u => u.id === ujian.id)
      )

    return NextResponse.json({
      success: true,
      data: completedUjian
    })

  } catch (error: unknown) {
    console.error('Error in GET /api/ujian/completed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}