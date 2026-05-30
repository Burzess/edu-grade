import { type SupabaseClient } from '@supabase/supabase-js'
import { autoGradeQuestion, needsAIGrading } from '@/lib/auto-grading'
import { logger } from '@/lib/logger'

export interface GradeMCResult {
  success: boolean
  autoGradedCount: number
  skippedEssayCount: number
  errorCount: number
  totalProcessed: number
}

export interface GradeMCOptions {
  ujianId: string
  siswaId: string
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
  }
}

/**
 * Auto-grade all MC/TF questions for a given ujian and siswa.
 *
 * Fetches ungraded jawaban (score IS NULL), filters to MC/TF types,
 * resolves option IDs to text for correct_answer, calls autoGradeQuestion(),
 * and batch updates scores using the provided admin Supabase client.
 *
 * Handles partial failures gracefully — continues processing remaining
 * answers when individual updates fail.
 */
export async function gradeMCOnSubmission(
  supabase: SupabaseClient,
  ujianId: string,
  siswaId: string
): Promise<GradeMCResult> {
  // Step 1: Fetch all ungraded jawaban with soal data
  const { data: jawabanList, error: fetchError } = await supabase
    .from('jawaban_siswa')
    .select('id, answer_text, score, soal!inner(id, question_text, question_type, correct_answer, options)')
    .eq('ujian_id', ujianId)
    .eq('siswa_id', siswaId)
    .is('score', null)

  if (fetchError) {
    logger.error('gradeMCOnSubmission: Failed to fetch jawaban', { ujianId, siswaId, error: fetchError })
    return {
      success: false,
      autoGradedCount: 0,
      skippedEssayCount: 0,
      errorCount: 0,
      totalProcessed: 0,
    }
  }

  if (!jawabanList || jawabanList.length === 0) {
    return {
      success: true,
      autoGradedCount: 0,
      skippedEssayCount: 0,
      errorCount: 0,
      totalProcessed: 0,
    }
  }

  const jawabans = jawabanList as unknown as JawabanWithSoal[]

  let autoGradedCount = 0
  let skippedEssayCount = 0
  let errorCount = 0

  // Step 2: Classify and grade each jawaban
  const updates: Array<{ id: string; score: number; feedback: string }> = []

  for (const jawaban of jawabans) {
    const questionType = jawaban.soal.question_type

    // Skip essay questions — they need AI grading
    if (needsAIGrading(questionType)) {
      skippedEssayCount++
      continue
    }

    // Resolve correct answer (handle option ID → text mapping for MC)
    let correctAnswer = jawaban.soal.correct_answer
    if (questionType === 'multiple_choice' && jawaban.soal.options) {
      const correctOption = jawaban.soal.options.find(
        (opt) => opt.id === jawaban.soal.correct_answer
      )
      if (correctOption) {
        correctAnswer = correctOption.text
      }
    }

    // Grade the answer
    const result = autoGradeQuestion(
      questionType,
      jawaban.answer_text || '',
      correctAnswer || '',
      jawaban.soal.question_text
    )

    if (result) {
      updates.push({ id: jawaban.id, score: result.score, feedback: result.feedback })
    } else {
      errorCount++
    }
  }

  // Step 3: Batch update scores with individual error handling
  if (updates.length > 0) {
    const batchResults = await Promise.all(
      updates.map(({ id, score, feedback }) =>
        supabase
          .from('jawaban_siswa')
          .update({ score, ai_feedback: feedback, updated_at: new Date().toISOString() })
          .eq('id', id)
          .then((res) => ({ id, error: res.error }))
      )
    )

    for (const result of batchResults) {
      if (result.error) {
        logger.error('gradeMCOnSubmission: Failed to update jawaban', { jawabanId: result.id, error: result.error })
        errorCount++
      } else {
        autoGradedCount++
      }
    }
  }

  return {
    success: errorCount === 0,
    autoGradedCount,
    skippedEssayCount,
    errorCount,
    totalProcessed: jawabans.length,
  }
}
