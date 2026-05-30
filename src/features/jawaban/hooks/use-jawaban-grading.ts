/**
 * Jawaban grading utilities — auto-grade MC, calculate scores, trigger AI.
 */
import { createClient } from '@/lib/supabase/client'
import { BatchAIGradingOptions, BatchAIGradingResponse } from '@/types/ai-grading'

const supabase = createClient()

export async function checkMultipleChoiceAnswer(jawabanId: string, soalId: string, answer: string) {
  try {
    const { data: soal, error: soalError } = await supabase
      .from('soal')
      .select('correct_answer, question_type, options')
      .eq('id', soalId)
      .maybeSingle()

    if (soalError || !soal) return
    if (soal.question_type !== 'multiple_choice' || !soal.correct_answer) return

    const isCorrect = answer === soal.correct_answer
    const score = isCorrect ? 100 : 0

    const answerText = soal.options?.find((opt: any) => opt.id === answer)?.text || answer
    const correctText = soal.options?.find((opt: any) => opt.id === soal.correct_answer)?.text || soal.correct_answer

    const feedback = isCorrect
      ? `Benar! Jawaban Anda "${answerText}" adalah tepat.`
      : `Salah. Jawaban Anda "${answerText}" kurang tepat. Jawaban yang benar adalah "${correctText}".`

    await supabase
      .from('jawaban_siswa')
      .update({ score, ai_feedback: feedback, updated_at: new Date().toISOString() })
      .eq('id', jawabanId)

    const { data: jawabanData } = await supabase
      .from('jawaban_siswa')
      .select('siswa_id, ujian_id')
      .eq('id', jawabanId)
      .maybeSingle()

    if (jawabanData) {
      calculateUjianScore(jawabanData.ujian_id, jawabanData.siswa_id).catch(() => {})
    }
  } catch (error: unknown) {
    console.error('Error in auto-grading multiple choice:', error)
  }
}

export async function calculateUjianScore(ujianId: string, siswaId: string, attemptNumber?: number) {
  try {
    let actualAttempt = attemptNumber
    if (!actualAttempt) {
      const { data: currentAttempt } = await supabase
        .from('ujian_siswa')
        .select('attempt_number')
        .eq('ujian_id', ujianId)
        .eq('siswa_id', siswaId)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      actualAttempt = currentAttempt?.attempt_number || 1
    }

    const { data: allJawaban, error: jawabanError } = await supabase
      .from('jawaban_siswa')
      .select('score, soal_id')
      .eq('ujian_id', ujianId)
      .eq('siswa_id', siswaId)
      .eq('attempt_number', actualAttempt)

    if (jawabanError || !allJawaban) return

    const gradedAnswers = allJawaban.filter(j => j.score !== null)
    if (gradedAnswers.length === 0) return

    const totalScore = gradedAnswers.reduce((sum, j) => sum + (j.score || 0), 0)
    const averageScore = Math.round(totalScore / gradedAnswers.length)

    const { data: totalSoal } = await supabase
      .from('ujian_soal')
      .select('soal_id')
      .eq('ujian_id', ujianId)

    if (totalSoal && gradedAnswers.length >= totalSoal.length) {
      console.log('All answers graded! Final score:', averageScore)
    }
  } catch (error: unknown) {
    console.error('Error calculating ujian score:', error)
  }
}

export async function triggerAIGrading(jawabanId: string, soalId: string) {
  try {
    const { data: soal } = await supabase
      .from('soal')
      .select('question_type')
      .eq('id', soalId)
      .maybeSingle()

    if (!soal || soal.question_type !== 'essay') return

    const response = await fetch('/api/ai-grading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jawabanId }),
    })

    if (!response.ok) {
      console.error('AI grading request failed:', response.statusText)
    }
  } catch (error: unknown) {
    console.error('Error triggering AI grading:', error)
  }
}

export async function triggerBatchAIGrading(
  ujianId: string,
  options: BatchAIGradingOptions = {}
): Promise<BatchAIGradingResponse> {
  const { useOptimized = true, useBatching = true, forceAI = false } = options

  const response = await fetch('/api/ai-grading', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ujianId, useOptimized, useBatching, forceAI }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.error || 'Batch AI grading failed')
  }

  return await response.json()
}
