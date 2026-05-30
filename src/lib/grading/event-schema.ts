/**
 * Shared Zod schema for the AI-grading Inngest event payload.
 *
 * This schema is the single source of truth for the `essay/grade.requested`
 * event shape. Both the publisher (`/api/ai-grading`) and the worker
 * (`src/lib/inngest/functions.ts`) import this schema to guarantee they
 * agree on the required fields.
 *
 * Bug condition (1.18, 1.54): The publisher previously emitted
 * `{ jawabanId, question, correctAnswer, rubric }` without `answer`,
 * causing the worker to throw "Missing required data" on every event.
 *
 * Expected behavior (2.18, 2.54): A single shared schema ensures the
 * publisher includes `answer` and the worker can reach the AI grading step.
 */

import { z } from 'zod'

/**
 * Zod schema for the AI-grading event payload published to Inngest.
 *
 * All five fields are required:
 * - `jawabanId`: UUID identifying the student answer record
 * - `question`: The question text (non-empty)
 * - `answer`: The student's answer text (non-empty)
 * - `correctAnswer`: The reference/correct answer (non-empty)
 * - `rubric`: The grading rubric (non-empty)
 */
export const aiGradingEventSchema = z
  .object({
    jawabanId: z.string().uuid(),
    question: z.string().min(1, 'question must not be empty'),
    answer: z.string().min(1, 'answer must not be empty'),
    correctAnswer: z.string().min(1, 'correctAnswer must not be empty'),
    rubric: z.string().min(1, 'rubric must not be empty'),
  })
  .strict()

/**
 * TypeScript type inferred from the schema.
 * Use this for type-safe access to the event payload.
 */
export type AiGradingEventPayload = z.infer<typeof aiGradingEventSchema>
