import { z } from 'zod'

/**
 * Zod schema for POST /api/admin/security-events — log a security event.
 *
 * Matches the existing payload shape:
 *   { event_type: string, ujian_id?: string, severity?: string, details?: object, source?: string }
 */
export const securityEventCreateSchema = z.object({
  event_type: z.string().min(1, 'event_type is required'),
  ujian_id: z.string().uuid().optional().nullable(),
  severity: z.string().optional().nullable(),
  details: z.record(z.unknown()).optional().nullable(),
  source: z.string().optional().nullable(),
})

export type SecurityEventCreatePayload = z.infer<typeof securityEventCreateSchema>
