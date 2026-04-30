import { inngest } from './client'
import { createClient } from '@/lib/supabase/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

// Zod schema untuk structured output dari AI
const GradingResultSchema = z.object({
  skor_akhir: z.number().int().min(0).max(100),
  analisis_rubrik: z.string(),
  kriteria_terpenuhi: z.array(z.string()),
  kekurangan: z.array(z.string()),
  saran_perbaikan: z.string()
})

type GradingResult = z.infer<typeof GradingResultSchema>

// Background job untuk AI grading dengan concurrency control
export const gradeEssayJob = inngest.createFunction(
  {
    id: 'grade-essay',
    name: 'Grade Essay with AI',
    // TAHAP 2: Rate limiting - maksimal 2 concurrent requests
    concurrency: [
      {
        limit: 2,
        key: 'event.data.jawabanId'
      }
    ],
    triggers: [{ event: 'essay/grade.requested' }]
  },
  async ({ event, step }) => {
    const { jawabanId, question, answer, correctAnswer, rubric } = event.data

    // Step 1: Validate data
    const validatedData = await step.run('validate-data', async () => {
      if (!jawabanId || !question || !answer) {
        throw new Error('Missing required data')
      }
      return { jawabanId, question, answer, correctAnswer, rubric }
    })

    // Step 2: Call AI with generateObject (Tahap 3: Structured JSON output)
    const gradingResult = await step.run('call-ai-grading', async () => {
      try {
        // Build base prompt
        let prompt = correctAnswer 
          ? `Sebagai sistem penilaian otomatis, nilai essay berikut dengan menggunakan kunci jawaban sebagai referensi:

PERTANYAAN:
${question}

KUNCI JAWABAN:
${correctAnswer}

JAWABAN SISWA:
${answer}`
          : `Sebagai sistem penilaian otomatis, nilai essay berikut:

PERTANYAAN:
${question}

JAWABAN SISWA:
${answer}`

        // Use teacher's rubric as primary criteria if available,
        // otherwise fall back to default criteria
        if (validatedData.rubric?.trim()) {
          prompt += `

RUBRIK PENILAIAN DARI GURU:
${validatedData.rubric}

Harap gunakan rubrik ini sebagai dasar UTAMA penilaian Anda.
Berikan penilaian objektif dengan skor 0-100.`
        } else if (correctAnswer) {
          prompt += `

Kriteria penilaian:
1. Kesesuaian dengan kunci jawaban (50%)
2. Kelengkapan jawaban (25%)
3. Kejelasan dan struktur (15%)
4. Penggunaan bahasa (10%)

Berikan penilaian objektif dengan skor 0-100.`
        } else {
          prompt += `

Kriteria penilaian:
1. Keakuratan dan relevansi (40%)
2. Kelengkapan jawaban (30%)
3. Kejelasan dan struktur (20%)
4. Penggunaan bahasa (10%)

Berikan penilaian objektif dengan skor 0-100.`
        }

        // TAHAP 3: Gunakan generateObject untuk structured output
        const { object } = await generateObject({
          model: google('gemini-3-flash-preview'),
          schema: GradingResultSchema,
          prompt,
          temperature: 0.3
        })

        return object
      } catch (error: unknown) {
        console.error('AI grading error:', error)
        // Fallback scoring
        return {
          skor_akhir: 50,
          analisis_rubrik: 'Sistem penilaian AI mengalami gangguan. Jawaban akan dinilai manual oleh guru.',
          kriteria_terpenuhi: [],
          kekurangan: ['Penilaian otomatis gagal'],
          saran_perbaikan: 'Hubungi guru untuk penilaian manual.'
        } satisfies GradingResult
      }
    })

    // Step 3: Update database dengan hasil grading
    await step.run('update-database', async () => {
      const supabase = await createClient()
      
      const { error } = await supabase
        .from('jawaban_siswa')
        .update({
          score: gradingResult.skor_akhir,
          ai_feedback: `${gradingResult.analisis_rubrik}\n\nKriteria terpenuhi:\n${gradingResult.kriteria_terpenuhi.join('\n')}\n\nKekurangan:\n${gradingResult.kekurangan.join('\n')}\n\nSaran:\n${gradingResult.saran_perbaikan}`,
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
