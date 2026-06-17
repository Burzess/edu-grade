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

    // Build ujian query
    let selectQuery = `
        id,
        name,
        description,
        status,
        start_time,
        end_time,
        created_by,
        guru_id,
        created_at,
        allow_remidi,
        max_attempts
      `
    if (kelasId) {
      selectQuery += `, ujian_kelas!inner(kelas_id)`
    }

    let query = supabase
      .from('ujian')
      .select(selectQuery)

    // Filter by kelas_id if provided
    if (kelasId) {
      query = query.eq('ujian_kelas.kelas_id', kelasId)
    }

    // Parallelize all independent queries
    const [profileResult, ujianResult, ujianSiswaResult, jawabanResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single(),
      query.order('created_at', { ascending: false }),
      supabase
        .from('ujian_siswa')
        .select('ujian_id, status, attempt_number')
        .eq('siswa_id', user.id),
      supabase
        .from('jawaban_siswa')
        .select('ujian_id')
        .eq('siswa_id', user.id),
    ])

    // Check if user is siswa
    if (profileResult.data?.role !== 'siswa') {
      return NextResponse.json({
        success: false,
        error: 'Hanya siswa yang dapat mengakses endpoint ini'
      }, { status: 403 })
    }

    const ujianData = ujianResult.data as any[] | null;
    const ujianError = ujianResult.error;

    if (ujianError) {
      console.error('[ujian/available] ujianError:', ujianError)
      return NextResponse.json({
        success: false,
        error: 'Gagal mengambil data ujian'
      }, { status: 500 })
    }

    // Group by ujian_id to get attempt counts
    const { data: ujianSiswaRecords } = ujianSiswaResult
    const ujianAttemptMap = new Map<string, { completedCount: number; hasInProgress: boolean }>()
    ujianSiswaRecords?.forEach(record => {
      const existing = ujianAttemptMap.get(record.ujian_id) || { completedCount: 0, hasInProgress: false }
      if (record.status === 'completed') existing.completedCount++
      if (record.status === 'in_progress') existing.hasInProgress = true
      ujianAttemptMap.set(record.ujian_id, existing)
    })

    // Jawaban for backward compatibility
    const { data: completedUjian } = jawabanResult
    const ujianWithJawaban = new Set(completedUjian?.map(j => j.ujian_id) || []);

    // Get guru names for ujian (depends on ujianData, so cannot be parallelized above)
    const guruIds = [...new Set((ujianData || []).map(ujian => ujian.guru_id || ujian.created_by).filter(Boolean))]
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
        
        // If student has an in_progress attempt, don't show as "available"
        if (attemptInfo?.hasInProgress) return false
        
        // If no attempts and no jawaban, it's available
        if (!attemptInfo && !hasJawaban) return true
        
        // If exam allows remidi and student hasn't exhausted attempts
        if (ujian.allow_remidi && attemptInfo) {
          return ujian.max_attempts === 0 || attemptInfo.completedCount < (ujian.max_attempts || 1)
        }
        
        // Otherwise filter out completed exams
        return !hasJawaban && !attemptInfo
      })
      .map(ujian => {
        const guru = guruData.find(g => g.id === (ujian.guru_id || ujian.created_by))
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
    console.error('[ujian/available] Unhandled error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan pada server' 
      },
      { status: 500 }
    )
  }
}
