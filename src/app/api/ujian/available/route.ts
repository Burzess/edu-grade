import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    let query = supabase
      .from('ujian')
      .select(`
        id,
        name,
        description,
        status,
        start_time,
        end_time,
        created_by,
        created_at,
        kelas_id
      `)

    // Filter by kelas_id if provided
    if (kelasId) {
      query = query.eq('kelas_id', kelasId)
    }

    const { data: ujianData, error: ujianError } = await query
      .order('created_at', { ascending: false })

    if (ujianError) {
      console.error('Error fetching ujian:', ujianError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ujian'
      }, { status: 500 })
    }

    // Get completed ujian for this siswa to filter out
    const { data: completedUjian } = await supabase
      .from('jawaban_siswa')
      .select('ujian_id')
      .eq('siswa_id', user.id)

    const completedUjianIds = completedUjian?.map(j => j.ujian_id) || []

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

    // Filter out completed ujian and add additional info
    const availableUjian = (ujianData || [])
      .filter(ujian => !completedUjianIds.includes(ujian.id))
      .map(ujian => {
        const guru = guruData.find(g => g.id === ujian.created_by)
        // Calculate duration from start and end time
        const durationMinutes = ujian.start_time && ujian.end_time 
          ? Math.round((new Date(ujian.end_time).getTime() - new Date(ujian.start_time).getTime()) / (1000 * 60))
          : 60 // default 60 minutes
        
        return {
          ...ujian,
          exam_id: ujian.id, // for compatibility
          guru_id: ujian.created_by, // for compatibility
          guru_name: guru?.full_name || 'Tidak diketahui',
          duration_minutes: durationMinutes,
          total_questions: 0 // You can add a query to count questions if needed
        }
      })

    return NextResponse.json({
      success: true,
      data: availableUjian
    })

  } catch (error) {
    console.error('Error in GET /api/ujian/available:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}