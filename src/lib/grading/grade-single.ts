import { type SupabaseClient } from '@supabase/supabase-js'
import { autoGradeQuestion, needsAIGrading } from '@/lib/auto-grading'
import { inngest } from '@/lib/inngest/client'
import { aiGradingEventSchema } from '@/lib/grading/event-schema'
import { isInngestAvailable } from '@/lib/grading/inngest-check'
import { gradeEssayWithAI } from '@/lib/grading/grade-essay-core'
import { logger } from '@/lib/logger'

export interface GradeSingleResult {
  success: boolean
  score?: number | null
  feedback?: string
  reasoning?: string
  method?: string
  status?: string
  message?: string
  jawabanId?: string
  costSaved?: boolean
  error?: string
  httpStatus?: number
}

interface JawabanWithSoal {
  id: string
  answer_text: string | null
  score: number | null
  soal: {
    id: string
    question_text: string
    question_type: string
    correct_answer: string | null
    options: Array<{ id: string; text: string }> | null
    rubric: string | null
  }
}

/**
 * Grade a single jawaban. Handles:
 * - Already graded → skip
 * - Empty answer → score 0
 * - Auto-gradable (MC/TF) → instant grade
 * - Essay → trigger Inngest background job if available, else direct sync grading
 */
export async function gradeSingleJawaban(
  supabase: SupabaseClient,
  jawabanId: string,
  forceAI: boolean
): Promise<GradeSingleResult> {
  // Fetch jawaban with soal
  const { data: jawaban, error: fetchError } = await supabase
    .from('jawaban_siswa')
    .select(`
      *,
      soal!inner(
        id, question_text, question_type, correct_answer, options, rubric
      )
    `)
    .eq('id', jawabanId)
    .single()

  if (fetchError || !jawaban) {
    return { success: false, error: 'Jawaban tidak ditemukan', httpStatus: 404 }
  }

  const j = jawaban as unknown as JawabanWithSoal

  // Already graded
  if (j.score !== null) {
    return { success: true, message: 'Sudah dinilai', score: j.score }
  }

  // Empty answer
  if (!j.answer_text || j.answer_text.trim() === '') {
    await supabase
      .from('jawaban_siswa')
      .update({ score: 0, ai_feedback: 'Tidak ada jawaban yang diberikan.', updated_at: new Date().toISOString() })
      .eq('id', jawabanId)
    return { success: true, score: 0, feedback: 'Tidak ada jawaban yang diberikan.', method: 'auto_empty' }
  }

  // Auto-grade (MC, TF, etc.)
  if (!forceAI && !needsAIGrading(j.soal.question_type)) {
    const result = tryAutoGrade(j)
    if (result) {
      const { error: updateError } = await supabase
        .from('jawaban_siswa')
        .update({ score: result.score, ai_feedback: result.feedback, updated_at: new Date().toISOString() })
        .eq('id', jawabanId)
      if (updateError) {
        return { success: false, error: 'Gagal memperbarui skor', httpStatus: 500 }
      }
      return { success: true, score: result.score, feedback: result.feedback, reasoning: result.reasoning, method: result.method, costSaved: true }
    }
  }

  // Essay → Hybrid grading (Inngest if ready, fallback to direct sync)
  return await triggerEssayGrading(supabase, j, jawabanId)
}

function tryAutoGrade(j: JawabanWithSoal) {
  let correctAnswer = j.soal.correct_answer
  let studentAnswer = j.answer_text || ''
  if (j.soal.question_type === 'multiple_choice' && j.soal.options) {
    const correctOption = j.soal.options.find(opt => String(opt.id) === String(j.soal.correct_answer))
    correctAnswer = correctOption?.text || j.soal.correct_answer
    
    const studentOption = j.soal.options.find(opt => String(opt.id) === String(j.answer_text))
    if (studentOption) {
      studentAnswer = studentOption.text
    }
  }
  return autoGradeQuestion(j.soal.question_type, studentAnswer, correctAnswer || '', j.soal.question_text)
}

async function triggerEssayGrading(
  supabase: SupabaseClient,
  j: JawabanWithSoal,
  jawabanId: string
): Promise<GradeSingleResult> {
  const inngestReady = await isInngestAvailable()

  if (inngestReady) {
    try {
      // Safe fallback strings for required Zod event schema fields
      const fallbackCorrect = j.soal.correct_answer?.trim() || 'Nilai berdasarkan konsep materi yang relevan.'
      const fallbackRubric = j.soal.rubric?.trim() || 'Kriteria: Keakuratan konsep (40%), Kelengkapan jawaban (30%), Kejelasan struktur (20%), Bahasa (10%).'

      const eventPayload = aiGradingEventSchema.parse({
        jawabanId,
        question: j.soal.question_text || '',
        answer: j.answer_text || '',
        correctAnswer: fallbackCorrect,
        rubric: fallbackRubric,
      })

      // Mark as pending before sending
      await supabase
        .from('jawaban_siswa')
        .update({ score: null, ai_feedback: 'Sedang dinilai oleh AI... (PENDING)', updated_at: new Date().toISOString() })
        .eq('id', jawabanId)

      await inngest.send({ name: 'essay/grade.requested', data: eventPayload })
      return { success: true, status: 'PENDING', message: 'Penilaian sedang diproses di background.', jawabanId }
    } catch (inngestError) {
      logger.warn('Inngest send failed, falling back to direct sync grading:', inngestError)
    }
  }

  // Direct sync fallback (Inngest offline or failed)
  return await gradeDirectSync(supabase, j, jawabanId)
}

async function gradeDirectSync(
  supabase: SupabaseClient,
  j: JawabanWithSoal,
  jawabanId: string
): Promise<GradeSingleResult> {
  try {
    const result = await gradeEssayWithAI({
      question: j.soal.question_text,
      answer: j.answer_text || '',
      correctAnswer: j.soal.correct_answer,
      rubric: j.soal.rubric,
    })

    const { error: updateError } = await supabase
      .from('jawaban_siswa')
      .update({
        score: result.score,
        ai_feedback: result.feedback,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jawabanId)

    if (updateError) {
      logger.error('Failed to update score during direct sync grading:', updateError)
      return { success: false, error: 'Gagal menyimpan hasil penilaian', httpStatus: 500 }
    }

    return {
      success: true,
      score: result.score,
      feedback: result.feedback,
      reasoning: result.reasoning,
      method: 'direct_ai_sync',
    }
  } catch (syncError) {
    logger.error('Direct sync grading error:', syncError)
    return { success: false, error: 'Penilaian AI langsung gagal diproses', httpStatus: 500 }
  }
}
