import { type SupabaseClient } from '@supabase/supabase-js'
import { autoGradeQuestion, needsAIGrading } from '@/lib/auto-grading'
import { logger } from '@/lib/logger'
import { inngest } from '@/lib/inngest/client'
import { aiGradingEventSchema } from '@/lib/grading/event-schema'
import { isInngestAvailable } from '@/lib/grading/inngest-check'
import { gradeEssayWithAI } from '@/lib/grading/grade-essay-core'

export interface BatchGradeOptions {
  ujianId: string
  useBatching?: boolean
  useOptimized?: boolean
  forceAI?: boolean
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

/**
 * Batch grade all ungraded jawaban for a given ujian.
 * Separates auto-gradable (MC/TF) from AI-needed (essay) questions.
 * Supports hybrid flow: Inngest queue when available, direct sync fallback when offline.
 */
export async function gradeBatch(
  supabase: SupabaseClient,
  options: BatchGradeOptions
): Promise<BatchGradeResult> {
  const { ujianId, forceAI } = options

  // Fetch ungraded jawaban
  const { data: jawabanList, error: fetchError } = await supabase
    .from('jawaban_siswa')
    .select(`*, soal!inner(id, question_text, question_type, correct_answer, options, rubric)`)
    .eq('ujian_id', ujianId)
    .is('score', null)

  if (fetchError) {
    return {
      success: false,
      autoGradedCount: 0,
      aiGradedCount: 0,
      errorCount: 0,
      totalProcessed: 0,
      processingTimeMs: 0,
      method: 'hybrid',
      costSavingsPercent: 0,
      error: 'Gagal mengambil data jawaban',
      httpStatus: 500,
    }
  }

  if (!jawabanList || jawabanList.length === 0) {
    return {
      success: true,
      autoGradedCount: 0,
      aiGradedCount: 0,
      errorCount: 0,
      totalProcessed: 0,
      processingTimeMs: 0,
      method: 'hybrid',
      costSavingsPercent: 0,
      message: 'Tidak ada jawaban yang belum dinilai',
    }
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
  let method = 'inngest_hybrid'

  // Phase 1: Auto-grade MC/TF (instant)
  const autoResults = autoGradable
    .map(ad => {
      try {
        const r = autoGradeQuestion(ad.questionType, ad.studentAnswer, ad.correctAnswer || '', ad.question)
        return r ? { id: ad.id, score: r.score, feedback: r.feedback } : null
      } catch {
        errorCount++
        return null
      }
    })
    .filter((r): r is { id: string; score: number; feedback: string } => r !== null)

  const autoUpdates = await Promise.all(
    autoResults.map(r => updateScore(supabase, r.id, r.score, r.feedback))
  )
  const autoGradedCount = autoUpdates.filter(Boolean).length
  errorCount += autoUpdates.filter(x => !x).length

  // Phase 2: AI-grade essays
  if (aiNeeded.length > 0) {
    const inngestReady = await isInngestAvailable()
    let sentToInngest = false

    if (inngestReady) {
      try {
        const events = aiNeeded.map(ad => {
          const fallbackCorrect = ad.correctAnswer?.trim() || 'Nilai berdasarkan konsep materi yang relevan.'
          const fallbackRubric = ad.rubric?.trim() || 'Kriteria: Keakuratan konsep (40%), Kelengkapan jawaban (30%), Kejelasan struktur (20%), Bahasa (10%).'

          return {
            name: 'essay/grade.requested' as const,
            data: aiGradingEventSchema.parse({
              jawabanId: ad.id,
              question: ad.question || '',
              answer: ad.studentAnswer || '',
              correctAnswer: fallbackCorrect,
              rubric: fallbackRubric,
            }),
          }
        })

        // Mark all as pending in DB first
        const updates = aiNeeded.map(ad =>
          supabase
            .from('jawaban_siswa')
            .update({
              score: null,
              ai_feedback: 'Sedang dinilai oleh AI... (PENDING)',
              updated_at: new Date().toISOString(),
            })
            .eq('id', ad.id)
        )
        await Promise.all(updates)

        // Send to Inngest
        await inngest.send(events)
        aiGradedCount += events.length
        sentToInngest = true
        method = 'inngest_hybrid'
      } catch (e) {
        logger.warn('Failed to dispatch batch to Inngest, falling back to direct sync:', e)
      }
    }

    // Direct sync fallback if Inngest is offline or dispatch failed
    if (!sentToInngest) {
      method = 'direct_sync_fallback'
      for (const ad of aiNeeded) {
        try {
          const result = await gradeEssayWithAI({
            question: ad.question,
            answer: ad.studentAnswer || '',
            correctAnswer: ad.correctAnswer,
            rubric: ad.rubric,
          })

          const ok = await updateScore(supabase, ad.id, result.score, result.feedback)
          if (ok) {
            aiGradedCount++
          } else {
            errorCount++
          }

          // Small delay to respect API rate limits (15 RPM)
          if (aiNeeded.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        } catch (err) {
          logger.error('Direct sync essay grading error:', err)
          errorCount++
        }
      }
    }
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
    method,
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
  if (soal.question_type === 'multiple_choice' && soal.options) {
    const options = soal.options as Array<{ id: string; text: string }> | null
    if (soal.correct_answer) {
      const correct = options?.find(o => String(o.id) === String(soal.correct_answer))
      if (correct) ad.correctAnswer = correct.text
    }
    if (jawaban.answer_text) {
      const student = options?.find(o => String(o.id) === String(jawaban.answer_text))
      if (student) ad.studentAnswer = student.text
    }
  } else {
    ad.correctAnswer = (soal.correct_answer as string) || undefined
  }
  if (soal.rubric) ad.rubric = soal.rubric as string
  return ad
}

async function updateScore(supabase: SupabaseClient, id: string, score: number | null, feedback: string): Promise<boolean> {
  const { error } = await supabase
    .from('jawaban_siswa')
    .update({ score, ai_feedback: feedback, updated_at: new Date().toISOString() })
    .eq('id', id)
  return !error
}
