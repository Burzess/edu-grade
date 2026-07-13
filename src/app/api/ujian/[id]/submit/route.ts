import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api/parse-json-body'
import { apiError } from '@/lib/api/error-envelope'
import { submitUjianRequestSchema } from './_schema'
import { gradeMCOnSubmission } from '@/lib/grading/grade-mc-submission'
import { logger } from '@/lib/logger'

export interface SubmitUjianResponse {
  success: boolean
  message: string
  gradingResult?: {
    autoGradedCount: number
    skippedEssayCount: number
    totalJawaban: number
  }
}

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

    // Step 2: Check user role — only siswa can submit exams
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return apiError('auth/profile-not-found', 'Profil pengguna tidak ditemukan', undefined, 403)
    }

    if (profile.role !== 'siswa') {
      return apiError('auth/forbidden', 'Hanya siswa yang dapat mengumpulkan ujian', undefined, 403)
    }

    // Step 3: Validate siswa is registered and in 'in_progress' status
    const { data: ujianSiswa, error: ujianSiswaError } = await supabase
      .from('ujian_siswa')
      .select('id, status, attempt_number')
      .eq('ujian_id', ujianId)
      .eq('siswa_id', user.id)
      .order('attempt_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (ujianSiswaError || !ujianSiswa) {
      return apiError(
        'exam/not-registered',
        'Siswa tidak terdaftar pada ujian ini',
        undefined,
        400
      )
    }

    if (ujianSiswa.status === 'completed') {
      return apiError(
        'exam/already-submitted',
        'Ujian sudah dikumpulkan sebelumnya',
        undefined,
        400
      )
    }

    if (ujianSiswa.status !== 'in_progress') {
      return apiError(
        'exam/not-in-progress',
        'Ujian tidak dalam status pengerjaan',
        undefined,
        400
      )
    }

    // Step 4: Parse and validate request body
    const parseResult = await parseJsonBody(request, submitUjianRequestSchema)
    if ('response' in parseResult) {
      return parseResult.response
    }
    const { data: body } = parseResult

    // Step 5: Batch upsert jawaban_siswa
    // Gunakan admin client untuk membypass RLS update policy yang mungkin belum tersetting
    const adminSupabase = await createAdminClient()
    
    // Fetch existing jawaban first to get their IDs, preventing unique constraint errors
    const { data: existingJawaban } = await adminSupabase
      .from('jawaban_siswa')
      .select('id, soal_id')
      .eq('ujian_id', ujianId)
      .eq('siswa_id', user.id)
      .eq('attempt_number', ujianSiswa.attempt_number || 1)

    const jawabanToUpsert = body.jawaban.map((j) => {
      const existing = existingJawaban?.find((ej) => ej.soal_id === j.soal_id)
      return {
        ...(existing ? { id: existing.id } : {}),
        ujian_id: ujianId,
        siswa_id: user.id,
        soal_id: j.soal_id,
        answer_text: j.answer_text,
        attempt_number: ujianSiswa.attempt_number || 1,
      }
    })

    const { error: upsertError } = await adminSupabase
      .from('jawaban_siswa')
      .upsert(jawabanToUpsert)

    if (upsertError) {
      logger.error('Submit ujian: Failed to upsert jawaban', { ujianId, siswaId: user.id, error: upsertError })
      return apiError('exam/save-failed', 'Gagal menyimpan jawaban', undefined, 500)
    }

    // Step 6: Update ujian_siswa status to 'completed'
    const now = new Date().toISOString()
    const { error: updateError } = await adminSupabase
      .from('ujian_siswa')
      .update({
        status: 'completed',
        submitted_at: now,
      })
      .eq('id', ujianSiswa.id)
      .eq('status', 'in_progress') // Atomic check to prevent concurrent submissions

    if (updateError) {
      logger.error('Submit ujian: Failed to update ujian_siswa status', { ujianId, siswaId: user.id, error: updateError })
      return apiError('exam/update-failed', 'Gagal memperbarui status ujian', undefined, 500)
    }

    // Step 7: Auto-grade MC/TF (best-effort, non-blocking on error)
    let gradingResult: SubmitUjianResponse['gradingResult'] | undefined
    try {
      const result = await gradeMCOnSubmission(adminSupabase, ujianId, user.id)
      gradingResult = {
        autoGradedCount: result.autoGradedCount,
        skippedEssayCount: result.skippedEssayCount,
        totalJawaban: result.totalProcessed,
      }
    } catch (error: unknown) {
      logger.error('Submit ujian: Auto-grade MC failed (non-blocking)', { ujianId, siswaId: user.id, error })
    }

    // Step 8: Return success response
    const response: SubmitUjianResponse = {
      success: true,
      message: 'Ujian berhasil dikumpulkan',
      gradingResult,
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    logger.error('Submit ujian: Unexpected error', { error })
    return apiError('server/internal', 'Terjadi kesalahan pada server', undefined, 500)
  }
}
