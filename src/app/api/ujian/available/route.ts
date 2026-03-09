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
        kelas_id,
        allow_remidi,
        max_attempts
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

    // Get ujian_siswa records for this siswa to check attempt status
    const { data: ujianSiswaRecords } = await supabase
      .from('ujian_siswa')
      .select('ujian_id, status, attempt_number')
      .eq('siswa_id', user.id)

    // Group by ujian_id to get attempt counts
    const ujianAttemptMap = new Map<string, { completedCount: number; hasInProgress: boolean }>()
    ujianSiswaRecords?.forEach(record => {
      const existing = ujianAttemptMap.get(record.ujian_id) || { completedCount: 0, hasInProgress: false }
      if (record.status === 'completed') existing.completedCount++
      if (record.status === 'in_progress') existing.hasInProgress = true
      ujianAttemptMap.set(record.ujian_id, existing)
    })

    // Also get jawaban for backward compatibility
    const { data: completedUjian } = await supabase
      .from('jawaban_siswa')
      .select('ujian_id')
      .eq('siswa_id', user.id)

    const ujianWithJawaban = new Set(completedUjian?.map(j => j.ujian_id) || [])

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

    // Filter ujian: show available (not completed) + remidi-eligible
    const availableUjian = (ujianData || [])
      .filter(ujian => {
        const attemptInfo = ujianAttemptMap.get(ujian.id)
        const hasJawaban = ujianWithJawaban.has(ujian.id)
        
        // If student has an in_progress attempt, don't show as "available" (they're already in)
        if (attemptInfo?.hasInProgress) return false
        
        // If no attempts and no jawaban, it's available
        if (!attemptInfo && !hasJawaban) return true
        
        // If exam allows remidi and student hasn't exhausted attempts
        if (ujian.allow_remidi && attemptInfo) {
          return attemptInfo.completedCount < (ujian.max_attempts || 1)
        }
        
        // Otherwise filter out completed exams
        return !hasJawaban && !attemptInfo
      })
      .map(ujian => {
        const guru = guruData.find(g => g.id === ujian.created_by)
        const attemptInfo = ujianAttemptMap.get(ujian.id)
        const durationMinutes = ujian.start_time && ujian.end_time 
          ? Math.round((new Date(ujian.end_time).getTime() - new Date(ujian.start_time).getTime()) / (1000 * 60))
          : 60

        return {
          ...ujian,
          exam_id: ujian.id,
          guru_id: ujian.created_by,
          guru_name: guru?.full_name || 'Tidak diketahui',
          duration_minutes: durationMinutes,
          total_questions: 0,
          // Remidi info
          is_remidi: (attemptInfo?.completedCount || 0) > 0,
          current_attempt: (attemptInfo?.completedCount || 0) + 1,
          completed_attempts: attemptInfo?.completedCount || 0,
        }
      })

    return NextResponse.json({
      success: true,
      data: availableUjian
    })

  } catch (error: unknown) {
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