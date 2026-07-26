import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api/error-envelope'
import { gradeMCOnSubmission } from '@/lib/grading/grade-mc-submission'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: ujianId } = await params
    const supabase = await createClient()

    // Step 1: Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('auth/unauthenticated', 'Tidak terautentikasi', undefined, 401)
    }

    // Step 2: Check user role — only guru or admin can force submit students
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'guru' && profile.role !== 'admin')) {
      return apiError('auth/forbidden', 'Hanya guru atau admin yang dapat melakukan force submit', undefined, 403)
    }

    // Step 3: Parse body
    let siswaId: string | undefined
    try {
      const body = await request.json()
      siswaId = body.siswa_id || body.siswaId
    } catch {
      // Body might be empty or invalid JSON, default to undefined (or 'all')
    }

    const adminSupabase = await createAdminClient()
    const now = new Date().toISOString()

    // Step 4: Find targeted in_progress attempts
    let query = adminSupabase
      .from('ujian_siswa')
      .select('id, siswa_id, attempt_number')
      .eq('ujian_id', ujianId)
      .eq('status', 'in_progress')

    if (siswaId && siswaId !== 'all') {
      query = query.eq('siswa_id', siswaId)
    }

    const { data: inProgressAttempts, error: fetchError } = await query

    if (fetchError) {
      logger.error('Force submit siswa: Error fetching ujian_siswa', { fetchError, ujianId, siswaId })
      return apiError('exam/fetch-failed', 'Gagal mengambil data peserta ujian', undefined, 500)
    }

    if (!inProgressAttempts || inProgressAttempts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada siswa dengan status pengerjaan (in_progress) yang ditemukan',
        completedCount: 0,
      })
    }

    // Step 5: Update status to 'completed'
    const attemptIds = inProgressAttempts.map(a => a.id)
    const { error: updateError } = await adminSupabase
      .from('ujian_siswa')
      .update({
        status: 'completed',
        submitted_at: now,
      })
      .in('id', attemptIds)

    if (updateError) {
      logger.error('Force submit siswa: Failed to update status', { updateError, attemptIds })
      return apiError('exam/update-failed', 'Gagal memperbarui status ujian siswa', undefined, 500)
    }

    // Step 6: Run auto-grading for each student
    let totalAutoGraded = 0
    for (const attempt of inProgressAttempts) {
      try {
        const gradeResult = await gradeMCOnSubmission(adminSupabase, ujianId, attempt.siswa_id)
        if (gradeResult.success) {
          totalAutoGraded += gradeResult.autoGradedCount
        }
      } catch (err) {
        logger.error('Force submit siswa: gradeMCOnSubmission failed', { err, ujianId, siswaId: attempt.siswa_id })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menyelesaikan ujian untuk ${attemptIds.length} siswa secara paksa`,
      completedCount: attemptIds.length,
      autoGradedQuestionsCount: totalAutoGraded,
    })
  } catch (error: unknown) {
    logger.error('Force submit siswa: Unexpected error', { error })
    return apiError('server/internal', 'Terjadi kesalahan pada server', undefined, 500)
  }
}
