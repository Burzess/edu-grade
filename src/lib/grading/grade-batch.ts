import { type SupabaseClient } from '@supabase/supabase-js'
import { gradeEssayAnswer } from '@/lib/ai-grading'
import { gradeEssayAnswerOptimized, optimizedBatchGradeAnswers, type PromptConfig } from '@/lib/ai-grading-optimized'
import { autoGradeQuestion, needsAIGrading } from '@/lib/auto-grading'
import { logger } from '@/lib/logger'

export interface BatchGradeOptions {
  ujianId: string
  useBatching: boolean
  useOptimized: boolean
  forceAI: boolean
}

export interface BatchGradeResult {
  success: boolean
  autoGradedCount: number
  aiGradedCount: number
  errorCount: number
  totalProcessed: number
  processingTimeMs: number
  method: string
  costSavingsPercent: number
  error?: string
  httpStatus?: number
  message?: string
}

interface AnswerData {
  id: string
  questionType: string
  studentAnswer: string
  question: string
  correctAnswer?: string
  rubric?: string
}

const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  mode: 'detailed',
  maxOutputTokens: 1500,
  temperature: 0.3,
}

/**
 * Batch grade all ungraded jawaban for a given ujian.
 * Separates auto-gradable (MC/TF) from AI-needed (essay) questions.
 */
export async function gradeBatch(
  supabase: SupabaseClient,
  options: BatchGradeOptions
): Promise<BatchGradeResult> {
  const { ujianId, useBatching, useOptimized, forceAI } = options

  // Fetch ungraded jawaban
  const { data: jawabanList, error: fetchError } = await supabase
    .from('jawaban_siswa')
    .select(`*, soal!inner(id, question_text, question_type, correct_answer, options, rubric)`)
    .eq('ujian_id', ujianId)
    .is('score', null)

  if (fetchError) {
    return { success: false, autoGradedCount: 0, aiGradedCount: 0, errorCount: 0, totalProcessed: 0, processingTimeMs: 0, method: 'hybrid', costSavingsPercent: 0, error: 'Gagal mengambil data jawaban', httpStatus: 500 }
  }

  if (!jawabanList || jawabanList.length === 0) {
    return { success: true, autoGradedCount: 0, aiGradedCount: 0, errorCount: 0, totalProcessed: 0, processingTimeMs: 0, method: 'hybrid', costSavingsPercent: 0, message: 'Tidak ada jawaban yang belum dinilai' }
  }

  // Classify answers
  const autoGradable: AnswerData[] = []
  const aiNeeded: AnswerData[] = []

  for (const jawaban of jawabanList) {
    const ad = buildAnswerData(jawaban)
    if (!forceAI && !needsAIGrading(jawaban.soal.question_type)) {
      autoGradable.push(ad)
    } else {
      aiNeeded.push(ad)
    }
  }

  const startTime = Date.now()
  let aiGradedCount = 0
  let errorCount = 0

  // Phase 1: Auto-grade
  const autoResults = autoGradable
    .map(ad => {
      try {
        const r = autoGradeQuestion(ad.questionType, ad.studentAnswer, ad.correctAnswer || '', ad.question)
        return r ? { id: ad.id, score: r.score, feedback: r.feedback } : null
      } catch { errorCount++; return null }
    })
    .filter((r): r is { id: string; score: number; feedback: string } => r !== null)

  const autoUpdates = await Promise.all(
    autoResults.map(r => updateScore(supabase, r.id, r.score, r.feedback))
  )
  const autoGradedCount = autoUpdates.filter(Boolean).length
  errorCount += autoUpdates.filter(x => !x).length

  // Phase 2: AI-grade essays
  if (aiNeeded.length > 0) {
    const aiResult = await gradeEssays(supabase, aiNeeded, useBatching, useOptimized)
    aiGradedCount += aiResult.graded
    errorCount += aiResult.errors
  }

  const processingTimeMs = Date.now() - startTime
  const totalProcessed = autoGradedCount + aiGradedCount
  const costSavingsPercent = jawabanList.length > 0
    ? Math.round((autoGradedCount / jawabanList.length) * 100)
    : 0

  return {
    success: true,
    autoGradedCount,
    aiGradedCount,
    errorCount,
    totalProcessed,
    processingTimeMs,
    method: 'hybrid_auto_ai_grading',
    costSavingsPercent,
  }
}

// --- Internal helpers ---

function buildAnswerData(jawaban: Record<string, unknown>): AnswerData {
  const soal = jawaban.soal as Record<string, unknown>
  const ad: AnswerData = {
    id: jawaban.id as string,
    questionType: soal.question_type as string,
    studentAnswer: (jawaban.answer_text as string) || '',
    question: soal.question_text as string,
  }
  if (soal.question_type === 'multiple_choice' && soal.correct_answer) {
    const options = soal.options as Array<{ id: string; text: string }> | null
    const correct = options?.find(o => o.id === soal.correct_answer)
    ad.correctAnswer = correct?.text || (soal.correct_answer as string)
  } else if (soal.correct_answer) {
    ad.correctAnswer = soal.correct_answer as string
  }
  if (soal.rubric) ad.rubric = soal.rubric as string
  return ad
}

async function updateScore(supabase: SupabaseClient, id: string, score: number, feedback: string): Promise<boolean> {
  const { error } = await supabase
    .from('jawaban_siswa')
    .update({ score, ai_feedback: feedback, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}

async function gradeEssays(
  supabase: SupabaseClient,
  answers: AnswerData[],
  useBatching: boolean,
  useOptimized: boolean
): Promise<{ graded: number; errors: number }> {
  let graded = 0
  let errors = 0

  if (useBatching && answers.length > 1) {
    try {
      const results = useOptimized
        ? await runOptimizedBatch(answers)
        : await runTraditionalBatch(answers)

      const updates = await Promise.all(
        results.map(r => updateScore(supabase, r.id, r.score, r.feedback))
      )
      graded += updates.filter(Boolean).length
      errors += updates.filter(x => !x).length
    } catch (batchError) {
      logger.warn('Batch grading failed, falling back to individual:', batchError)
      const fallback = await gradeIndividual(answers, useOptimized)
      const updates = await Promise.all(
        fallback.results.map(r => updateScore(supabase, r.id, r.score, r.feedback))
      )
      graded += updates.filter(Boolean).length
      errors += updates.filter(x => !x).length + fallback.errors
    }
  } else {
    const individual = await gradeIndividual(answers, useOptimized)
    const updates = await Promise.all(
      individual.results.map(r => updateScore(supabase, r.id, r.score, r.feedback))
    )
    graded += updates.filter(Boolean).length
    errors += updates.filter(x => !x).length + individual.errors
  }

  return { graded, errors }
}

async function runOptimizedBatch(answers: AnswerData[]) {
  const essayAnswers = answers.map(a => ({
    id: a.id, question: a.question, studentAnswer: a.studentAnswer,
    questionType: a.questionType as 'essay' | 'multiple_choice',
    correctAnswer: a.correctAnswer, rubric: a.rubric,
  }))
  const results = await optimizedBatchGradeAnswers(essayAnswers, DEFAULT_PROMPT_CONFIG)
  return results.map(r => ({ id: r.id, score: r.result.score, feedback: r.result.feedback }))
}

async function runTraditionalBatch(answers: AnswerData[]) {
  const { smartBatchGradeAnswers } = await import('@/lib/ai-grading')
  const essayAnswers = answers.map(a => ({
    id: a.id, question: a.question, studentAnswer: a.studentAnswer,
    questionType: a.questionType as 'essay' | 'multiple_choice',
    correctAnswer: a.correctAnswer,
  }))
  const results = await smartBatchGradeAnswers(essayAnswers, 3)
  return results.map(r => ({ id: r.id, score: r.result.score, feedback: r.result.feedback }))
}

async function gradeIndividual(
  answers: AnswerData[],
  useOptimized: boolean
): Promise<{ results: Array<{ id: string; score: number; feedback: string }>; errors: number }> {
  const results: Array<{ id: string; score: number; feedback: string }> = []
  let errors = 0

  for (const ad of answers) {
    try {
      if (!ad.studentAnswer?.trim()) {
        results.push({ id: ad.id, score: 0, feedback: 'Tidak ada jawaban yang diberikan.' })
        continue
      }
      const gradingResult = useOptimized
        ? await gradeEssayAnswerOptimized(ad.question, ad.studentAnswer, ad.questionType as 'essay' | 'multiple_choice', ad.correctAnswer, DEFAULT_PROMPT_CONFIG, 0, ad.rubric)
        : await gradeEssayAnswer(ad.question, ad.studentAnswer, ad.questionType as 'essay' | 'multiple_choice', ad.correctAnswer)
      results.push({ id: ad.id, score: gradingResult.score, feedback: gradingResult.feedback })
      await new Promise(resolve => setTimeout(resolve, useOptimized ? 800 : 1000))
    } catch {
      errors++
    }
  }

  return { results, errors }
}
