import { z } from 'zod'

export const autoSubmitReasonSchema = z.enum(['manual', 'time_expired', 'violation'], {
  errorMap: () => ({
    message: "autoSubmitReason harus 'manual', 'time_expired', atau 'violation'",
  }),
})

const jawabanItemSchema = z.object({
  soal_id: z.string().uuid({ message: 'soal_id harus berformat UUID yang valid' }),
  answer_text: z.string(),
})

export const submitUjianRequestSchema = z.object({
  jawaban: z
    .array(jawabanItemSchema)
    .nonempty({ message: 'jawaban tidak boleh kosong' }),
  autoSubmitReason: autoSubmitReasonSchema.optional().default('manual'),
})

export type SubmitUjianRequest = z.infer<typeof submitUjianRequestSchema>
export type JawabanItem = z.infer<typeof jawabanItemSchema>
export type AutoSubmitReason = z.infer<typeof autoSubmitReasonSchema>
