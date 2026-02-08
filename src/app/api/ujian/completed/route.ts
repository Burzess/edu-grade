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
      .select('id, name, description, created_by, kelas_id')
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

    // Get scores for completed ujian
    let scoresData: any[] = []

    if (ujianIds.length > 0) {
      const { data: scores } = await supabase
        .from('jawaban_siswa')
        .select(`
          ujian_id,
          score,
          ai_feedback
        `)
        .eq('siswa_id', user.id)
        .in('ujian_id', ujianIds)
    
      scoresData = scores || []
    }

    // Get guru names for ujian
    const guruIds = [...new Set((ujianData || []).map(ujian => ujian.created_by).filter(Boolean))]
    let guruData: any[] = []
    
    if (guruIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', guruIds)
      
      guruData = profiles || []
    }

    // Process completed ujian with scores
    const completedUjian = (completedData || [])
      .map((item: any) => {
        const ujianDetail = ujianData?.find(u => u.id === item.ujian_id)
        if (!ujianDetail) return null

        const ujianScores = scoresData.filter(s => s.ujian_id === item.ujian_id)
        const gradedAnswers = ujianScores.filter(s => s.score !== null && s.score !== undefined).length
        const totalAnswers = ujianScores.length
        const averageScore = gradedAnswers > 0 
          ? ujianScores
              .filter(s => s.score !== null && s.score !== undefined)
              .reduce((acc, s) => acc + s.score, 0) / gradedAnswers 
          : null

        const guru = guruData.find(g => g.id === ujianDetail.created_by)

        return {
          id: ujianDetail.id,
          name: ujianDetail.name,
          description: ujianDetail.description,
          guru_name: guru?.full_name || 'Tidak diketahui',
          lastAttempt: item.created_at,
          averageScore: averageScore ? Math.round(averageScore) : null,
          gradedAnswers,
          totalAnswers
        }
      })
      .filter(Boolean)
      // Remove duplicates by ujian_id
      .filter((ujian: any, index: number, self: any[]) => 
        index === self.findIndex(u => u.id === ujian.id)
      )

    return NextResponse.json({
      success: true,
      data: completedUjian
    })

  } catch (error) {
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