import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { gradeMCOnSubmission } from '@/lib/grading/grade-mc-submission'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    // Auth check — only guru can trigger auto-complete
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const now = new Date().toISOString()
    
    // Find active ujian yang sudah melewati end_time
    const { data: expiredUjian, error: findError } = await supabase
      .from('ujian')
      .select('id, name, end_time, created_by')
      .eq('status', 'active')
      .not('end_time', 'is', null)
      .lt('end_time', now)

    if (findError) {
      return NextResponse.json({ 
        success: false, 
        error: findError.message 
      }, { status: 500 })
    }

    if (!expiredUjian || expiredUjian.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Tidak ditemukan ujian yang kedaluwarsa',
        completed: []
      })
    }

    const ujianIds = expiredUjian.map(u => u.id)

    // Step 1: Cari semua siswa yang status ujiannya masih in_progress untuk ujian-ujian yang kedaluwarsa
    const { data: inProgressAttempts } = await supabase
      .from('ujian_siswa')
      .select('id, ujian_id, siswa_id')
      .in('ujian_id', ujianIds)
      .eq('status', 'in_progress')

    let autoCompletedSiswaCount = 0
    if (inProgressAttempts && inProgressAttempts.length > 0) {
      // Update status menjadi completed
      const attemptIds = inProgressAttempts.map(a => a.id)
      const { error: updateAttemptsError } = await supabase
        .from('ujian_siswa')
        .update({
          status: 'completed',
          submitted_at: now
        })
        .in('id', attemptIds)

      if (!updateAttemptsError) {
        autoCompletedSiswaCount = attemptIds.length
        // Run auto-grading untuk setiap siswa yang di-force submit
        for (const attempt of inProgressAttempts) {
          try {
            await gradeMCOnSubmission(supabase, attempt.ujian_id, attempt.siswa_id)
          } catch (err) {
            logger.error('Auto-complete: gradeMCOnSubmission failed for attempt', { attempt, error: err })
          }
        }
      } else {
        logger.error('Auto-complete: failed to update ujian_siswa status', { error: updateAttemptsError })
      }
    }

    // Update status ujian menjadi completed
    const { data: updatedUjian, error: updateError } = await supabase
      .from('ujian')
      .update({ 
        status: 'completed',
        updated_at: now
      })
      .in('id', ujianIds)
      .select('id, name, status, end_time')

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gagal memperbarui status ujian' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Berhasil menyelesaikan ${updatedUjian?.length || 0} ujian yang kedaluwarsa (${autoCompletedSiswaCount} siswa otomatis diselesaikan)`,
      completed: updatedUjian || [],
      autoCompletedSiswaCount
    })

  } catch (_error: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan pada server' 
    }, { status: 500 })
  }
}

// GET method untuk status check
export async function GET(_request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const now = new Date().toISOString()
    
    // Count active ujian yang akan expired dalam 1 jam
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { data: soonExpired, error } = await supabase
      .from('ujian')
      .select('id, name, end_time')
      .eq('status', 'active')
      .not('end_time', 'is', null)
      .gte('end_time', now)
      .lte('end_time', oneHourFromNow)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gagal memeriksa status' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      current_time: now,
      active_ujian_expiring_soon: soonExpired?.length || 0,
      ujian_details: soonExpired || []
    })

  } catch (_error: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan pada server' 
    }, { status: 500 })
  }
}
