import { type SupabaseClient } from '@supabase/supabase-js'
import { ensureProfileExists } from '@/lib/profile-utils'
import type { UserRole } from '@/types/auth'

export interface ProfileData {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
}

/**
 * 1. Cache lookup — check zustand store cache.
 */
export function lookupCachedProfile(
  userId: string,
  getCachedProfile: (id: string) => ProfileData | null
): ProfileData | null {
  const cached = getCachedProfile(userId)
  if (cached && cached.email && cached.role) return cached
  return null
}

/**
 * 2. Build profile from user metadata (fast path, no DB call).
 */
export function buildMetadataProfile(
  userId: string,
  email: string,
  metadata: Record<string, unknown>,
  createdAt: string
): ProfileData | null {
  if (metadata.role && metadata.full_name && email) {
    return {
      id: userId,
      email,
      full_name: metadata.full_name as string,
      role: metadata.role as UserRole,
      created_at: createdAt,
    }
  }
  return null
}

/**
 * 3. Fetch profile from database. Creates if not found.
 *    Returns null only on total failure.
 */
export async function fetchProfileFromDB(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  fullName: string,
  defaultRole: UserRole
): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (data) return data as ProfileData

  // Profile not found → create
  if (error?.code === 'PGRST116') {
    const result = await ensureProfileExists(userId, email, fullName, defaultRole)
    if (result.success) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (newProfile) return newProfile as ProfileData
    }
  }

  return null
}

/**
 * Build an emergency fallback profile (no DB, no network).
 */
export function buildFallbackProfile(
  userId: string,
  email: string,
  metadata: Record<string, unknown>,
  createdAt: string
): ProfileData {
  return {
    id: userId,
    email,
    full_name: (metadata.full_name as string) || email.split('@')[0] || 'User',
    role: (metadata.role as UserRole) || 'siswa',
    created_at: createdAt,
  }
}
