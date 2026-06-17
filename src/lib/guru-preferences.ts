import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const examDefaultsSchema = z.object({
  defaultDuration: z.number().int().min(1).max(300),
  passingGrade: z.number().int().min(0).max(100),
  autoPublish: z.boolean(),
  shuffleQuestions: z.boolean(),
  allowReview: z.boolean(),
})

const guruPreferencesSchema = z.object({
  examDefaults: examDefaultsSchema,
  sidebarCompact: z.boolean(),
})

export type GuruExamDefaults = z.infer<typeof examDefaultsSchema>
export type GuruPreferences = z.infer<typeof guruPreferencesSchema>

export const GURU_PREFERENCES_STORAGE_KEY = 'guru-preferences'
export const GURU_PREFERENCES_UPDATED_EVENT = 'guru-preferences-updated'

const defaultPreferences: GuruPreferences = {
  examDefaults: {
    defaultDuration: 60,
    passingGrade: 70,
    autoPublish: false,
    shuffleQuestions: true,
    allowReview: true,
  },
  sidebarCompact: false,
}

export function getDefaultGuruPreferences(): GuruPreferences {
  return {
    ...defaultPreferences,
    examDefaults: { ...defaultPreferences.examDefaults },
  }
}

export function loadGuruPreferences(): GuruPreferences {
  if (typeof window === 'undefined') return getDefaultGuruPreferences()

  try {
    const raw = window.localStorage.getItem(GURU_PREFERENCES_STORAGE_KEY)
    if (!raw) return getDefaultGuruPreferences()

    const parsed = guruPreferencesSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return getDefaultGuruPreferences()

    return {
      ...defaultPreferences,
      ...parsed.data,
      examDefaults: {
        ...defaultPreferences.examDefaults,
        ...parsed.data.examDefaults,
      },
    }
  } catch {
    return getDefaultGuruPreferences()
  }
}

export function saveGuruPreferences(preferences: GuruPreferences): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      GURU_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences)
    )
  } catch {
    // Abaikan error penyimpanan lokal
  }
}

export function updateGuruPreferences(
  partial: Partial<GuruPreferences>
): GuruPreferences {
  const current = loadGuruPreferences()
  const next: GuruPreferences = {
    ...current,
    ...partial,
    examDefaults: {
      ...current.examDefaults,
      ...partial.examDefaults,
    },
  }

  saveGuruPreferences(next)
  return next
}

export function dispatchGuruPreferencesUpdated(): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(GURU_PREFERENCES_UPDATED_EVENT))
}

// ---------------------------------------------------------------------------
// Database persistence
// ---------------------------------------------------------------------------

type SupabaseInstance = SupabaseClient<Database>

/**
 * Parse raw preferences JSON from the database into a validated
 * GuruPreferences object. Returns defaults when the data is missing
 * or invalid.
 */
function parsePreferencesFromDB(
  raw: Record<string, unknown> | null | undefined
): GuruPreferences {
  if (!raw) return getDefaultGuruPreferences()

  const parsed = guruPreferencesSchema.safeParse(raw)
  if (!parsed.success) return getDefaultGuruPreferences()

  return {
    ...defaultPreferences,
    ...parsed.data,
    examDefaults: {
      ...defaultPreferences.examDefaults,
      ...parsed.data.examDefaults,
    },
  }
}

/**
 * Load guru preferences from the database `profiles.preferences` column.
 * Also syncs the result into localStorage as a cache.
 */
export async function loadGuruPreferencesFromDB(
  supabase: SupabaseInstance,
  userId: string
): Promise<GuruPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return loadGuruPreferences() // Fallback ke localStorage
  }

  const preferences = parsePreferencesFromDB((data as { preferences: Record<string, unknown> | null }).preferences)

  // Sync ke localStorage sebagai cache lokal
  saveGuruPreferences(preferences)

  return preferences
}

/**
 * Save guru preferences to the database `profiles.preferences` column.
 * Also updates localStorage as a cache.
 */
export async function saveGuruPreferencesToDB(
  supabase: SupabaseInstance,
  userId: string,
  preferences: GuruPreferences
): Promise<{ success: boolean; error?: string }> {
  // Validasi sebelum simpan
  const validated = guruPreferencesSchema.safeParse(preferences)
  if (!validated.success) {
    return {
      success: false,
      error: 'Data preferensi tidak valid',
    }
  }

  type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
  const updateData: ProfileUpdate = {
    preferences: validated.data as unknown as Record<string, unknown>,
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData as never)
    .eq('id', userId)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  // Sync ke localStorage sebagai cache lokal
  saveGuruPreferences(validated.data)

  return { success: true }
}
