import { type SupabaseClient } from '@supabase/supabase-js'
import { ROLES, isUserRole, type UserRole } from '@/types/auth'
import { resolveRoleWithClient } from '@/lib/supabase/middleware'
import { logger } from '@/lib/logger'

/**
 * Resolve the user's role from the database.
 * Falls back to 'siswa' if resolution fails (safest default).
 *
 * SECURITY (2.32, 2.33): Always reads from profiles table.
 * Never trusts user_metadata.role.
 */
export async function resolveUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<UserRole> {
  try {
    const resolvedRole = await resolveRoleWithClient(supabase, userId)
    return isUserRole(resolvedRole) ? resolvedRole : ROLES.SISWA
  } catch (error) {
    logger.warn('Failed to fetch user role from database:', error)
    return ROLES.SISWA
  }
}
