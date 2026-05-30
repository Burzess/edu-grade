import type { VisibilitySetting } from '@/lib/schemas/visibility-schema'

/**
 * Data structure representing a student's exam results.
 */
export interface HasilSiswaData {
  ujian: {
    id: string
    name: string
    visibility_setting: VisibilitySetting
  }
  jawaban: Array<{
    id: string
    soal_id: string
    answer_text: string
    score: number | null
    ai_feedback: string | null
    soal: {
      question_text: string
      question_type: 'essay' | 'multiple_choice'
    }
  }>
  summary: {
    average_score: number | null
    total_correct: number | null
    is_passing: boolean | null
  } | null
}

/**
 * Filtered response when visibility is hidden.
 */
export interface HasilSiswaFiltered {
  ujian: HasilSiswaData['ujian']
  jawaban: Array<{
    id: string
    soal_id: string
    answer_text: string
    score: null
    ai_feedback: string | null
    soal: {
      question_text: string
      question_type: 'essay' | 'multiple_choice'
    }
  }>
  summary: null
  message: string
}

/**
 * Union type for the filter function return value.
 */
export type FilteredHasilSiswa = HasilSiswaData | HasilSiswaFiltered

/**
 * Filters student exam results based on the visibility setting.
 *
 * When `visibilitySetting` is "hidden":
 * - All `score` fields in jawaban are set to `null`
 * - `summary` is set to `null`
 * - A message "Nilai belum dipublikasikan oleh guru" is added
 * - `ai_feedback` for essay answers is preserved as-is
 * - `answer_text` and `soal` data are preserved
 *
 * When `visibilitySetting` is "visible":
 * - All data is returned unchanged
 */
export function filterHasilByVisibility(
  data: HasilSiswaData,
  visibilitySetting: VisibilitySetting
): FilteredHasilSiswa {
  if (visibilitySetting === 'visible') {
    return data
  }

  return {
    ujian: data.ujian,
    jawaban: data.jawaban.map((jawaban) => ({
      id: jawaban.id,
      soal_id: jawaban.soal_id,
      answer_text: jawaban.answer_text,
      score: null,
      ai_feedback: jawaban.ai_feedback,
      soal: jawaban.soal,
    })),
    summary: null,
    message: 'Nilai belum dipublikasikan oleh guru',
  }
}
