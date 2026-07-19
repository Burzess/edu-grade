import { z } from 'zod'

/**
 * Zod schema for POST /api/ai-grading — single answer grading request.
 *
 * Matches the existing payload shape sent by the UI:
 *   { jawabanId: string, useOptimized?: boolean, forceAI?: boolean }
 */
export const aiGradingPostSchema = z.object({
  jawabanId: z.string().min(1, 'jawabanId is required'),
  useOptimized: z.boolean().optional().default(false),
  forceAI: z.boolean().optional().default(false),
})

export type AiGradingPostPayload = z.infer<typeof aiGradingPostSchema>

/**
 * Zod schema for PUT /api/ai-grading — batch grading request.
 *
 * Matches the existing payload shape sent by the UI:
 *   { ujianId: string, useBatching?: boolean, useOptimized?: boolean, forceAI?: boolean }
 */
export const aiGradingPutSchema = z.object({
  ujianId: z.string().min(1, 'ujianId is required'),
  useBatching: z.boolean().optional().default(true),
  useOptimized: z.boolean().optional().default(false),
  forceAI: z.boolean().optional().default(false),
})

export type AiGradingPutPayload = z.infer<typeof aiGradingPutSchema>
