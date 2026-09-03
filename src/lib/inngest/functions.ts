import { inngest } from './client'
import { createClient } from '@/lib/supabase/server'
import { aiGradingEventSchema } from '@/lib/grading/event-schema'
import { gradeEssayWithAI, buildGradingPrompt, GradingResultSchema, type GradingResult } from '@/lib/grading/grade-essay-core'

export { buildGradingPrompt, GradingResultSchema, type GradingResult }

// Background job untuk AI grading dengan concurrency control
export const gradeEssayJob = inngest.createFunction(
  {
    id: 'grade-essay',
    name: 'Grade Essay with AI',
    retries: 3,
    concurrency: [
      {
        limit: 2,
        key: 'event.data.jawabanId'
      }
    ],
    triggers: [{ event: 'essay/grade.requested' }],
    onFailure: async ({ event }) => {
      const jawabanId = event.data.event.data.jawabanId
      const supabase = await createClient()
      await supabase
        .from('jawaban_siswa')
        .update({
          score: null,
          ai_feedback: 'Pending Manual Grading - Sistem penilaian AI mengalami gangguan, jawaban akan dinilai oleh guru',
          updated_at: new Date().toISOString()
        })
        .eq('id', jawabanId)
    }
  },
  async ({ event, step }) => {
    // Step 1: Validate data against the shared schema
    const validatedData = await step.run('validate-data', async () => {
      const result = aiGradingEventSchema.safeParse(event.data)
      if (!result.success) {
        throw new Error(`Missing required data: ${result.error.issues.map(i => i.message).join(', ')}`)
      }
      return result.data
    })

    const { question, answer, correctAnswer, rubric } = validatedData

    // Step 2: Call AI using core grading function
    const gradingResult = await step.run('call-ai-grading', async () => {
      const res = await gradeEssayWithAI({
        question,
        answer,
        correctAnswer,
        rubric,
      })

      return {
        skor_akhir: res.score,
        analisis_rubrik: res.rubricAnalysis,
        kriteria_terpenuhi: res.criteriaMet,
        kekurangan: res.weaknesses,
        saran_perbaikan: res.suggestions,
        feedback: res.feedback,
      }
    })

    // Step 3: Update database dengan hasil grading
    await step.run('update-database', async () => {
      const supabase = await createClient()

      const { error } = await supabase
        .from('jawaban_siswa')
        .update({
          score: gradingResult.skor_akhir,
          ai_feedback: gradingResult.feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.jawabanId)

      if (error) {
        throw new Error(`Failed to update database: ${error.message}`)
      }

      return {
        jawabanId: validatedData.jawabanId,
        score: gradingResult.skor_akhir,
        success: true
      }
    })

    return {
      jawabanId: validatedData.jawabanId,
      score: gradingResult.skor_akhir,
      message: 'Essay graded successfully'
    }
  }
)
