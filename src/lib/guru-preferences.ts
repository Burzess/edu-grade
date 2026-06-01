import { z } from 'zod'

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
