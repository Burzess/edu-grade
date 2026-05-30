import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { filterHasilByVisibility } from '@/lib/visibility-filter'
import type { HasilSiswaData } from '@/lib/visibility-filter'
import type { VisibilitySetting } from '@/lib/schemas/visibility-schema'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: ujianId } = await params
    const supabase = await createClient()

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Autentikasi diperlukan' },
        { status: 401 }
      )
    }

    // Verify user is a siswa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Profil pengguna tidak ditemukan' },
        { status: 401 }
      )
    }

    if (profile.role !== 'siswa') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Hanya siswa yang dapat mengakses hasil ujian melalui endpoint ini' },
        { status: 403 }
      )
    }

    // Query ujian to get visibility_setting
    const { data: ujian, error: ujianError } = await supabase
      .from('ujian')
      .select('id, name, visibility_setting')
      .eq('id', ujianId)
      .single()

    if (ujianError || !ujian) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Ujian tidak ditemukan' },
        { status: 404 }
      )
    }

    // Query jawaban_siswa joined with soal for this student's answers
    const { data: jawabanData, error: jawabanError } = await supabase
      .from('jawaban_siswa')
      .select(`
        id,
        soal_id,
        answer_text,
        score,
        ai_feedback,
        soal:soal_id (
          question_text,
          question_type
        )
      `)
      .eq('ujian_id', ujianId)
      .eq('siswa_id', user.id)

    if (jawabanError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Gagal mengambil data jawaban' },
        { status: 500 }
      )
    }

    // Transform jawaban data to match expected interface
    const jawaban = (jawabanData || []).map((item) => {
      const soal = item.soal as unknown as {
        question_text: string
        question_type: 'essay' | 'multiple_choice'
      }
      return {
        id: item.id,
        soal_id: item.soal_id,
        answer_text: item.answer_text,
        score: item.score,
        ai_feedback: item.ai_feedback,
        soal: {
          question_text: soal.question_text,
          question_type: soal.question_type,
        },
      }
    })

    // Calculate summary from jawaban data
    const scoredAnswers = jawaban.filter((j) => j.score !== null)
    const summary: HasilSiswaData['summary'] = scoredAnswers.length > 0
      ? {
          average_score: scoredAnswers.reduce((sum, j) => sum + (j.score ?? 0), 0) / scoredAnswers.length,
          total_correct: scoredAnswers.filter((j) => (j.score ?? 0) >= 70).length,
          is_passing: (scoredAnswers.reduce((sum, j) => sum + (j.score ?? 0), 0) / scoredAnswers.length) >= 70,
        }
      : null

    // Build the full data object
    const hasilData: HasilSiswaData = {
      ujian: {
        id: ujian.id,
        name: ujian.name,
        visibility_setting: ujian.visibility_setting as VisibilitySetting,
      },
      jawaban,
      summary,
    }

    // Apply visibility filtering
    const filteredResult = filterHasilByVisibility(hasilData, ujian.visibility_setting as VisibilitySetting)

    return NextResponse.json(filteredResult)
  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    )
  }
}
