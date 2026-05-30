import { z } from 'zod'

/**
 * Zod schema for POST /api/admin/kelas — admin creates a test kelas.
 *
 * Matches the existing payload shape:
 *   { nama_kelas?: string, guru_id?: string }
 *
 * Both fields are optional because the route has defaults:
 * - nama_kelas defaults to 'Test Kelas Debug'
 * - guru_id defaults to the first guru found in the DB
 */
export const adminKelasCreateSchema = z.object({
  nama_kelas: z.string().min(1).trim().optional(),
  guru_id: z.string().uuid('guru_id must be a valid UUID').optional(),
})

export type AdminKelasCreatePayload = z.infer<typeof adminKelasCreateSchema>
