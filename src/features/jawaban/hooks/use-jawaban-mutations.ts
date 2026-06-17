/**
 * Jawaban mutation hooks — submit, auto-save, batch submit, update, batch AI grading.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'
import { BatchAIGradingRequest, BatchAIGradingResponse } from '@/types/ai-grading'
import { toast } from 'sonner'
import { checkMultipleChoiceAnswer, calculateUjianScore, triggerAIGrading, triggerBatchAIGrading } from './use-jawaban-grading'

const supabase = createClient()

type JawabanSiswaInsert = Database['public']['Tables']['jawaban_siswa']['Insert']
type JawabanSiswaUpdate = Database['public']['Tables']['jawaban_siswa']['Update']

export function useSubmitJawaban() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (!jawaban.ujian_id || !jawaban.soal_id) throw new Error('Missing required fields: ujian_id or soal_id')
      if (jawaban.answer_text === undefined || jawaban.answer_text === null) throw new Error('answer_text cannot be null or undefined')

      const { data, error } = await supabase
        .from('jawaban_siswa')
        .upsert({ ...jawaban, siswa_id: user.id, updated_at: new Date().toISOString() })
        .select()
        .single()

      if (error) throw new Error(`Database error: ${error.message}`)
      if (!data) throw new Error('No data returned from Supabase')
      return data
    },
    onSuccess: (data) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id], exact: true })
      }, 500)
      checkMultipleChoiceAnswer(data.id, data.soal_id, data.answer_text)
      triggerAIGrading(data.id, data.soal_id)
    },
  })
}

export function useLocalAutoSave() {
  const saveToLocal = useCallback((ujianId: string, soalId: string, answer: string) => {
    try {
      const key = `ujian_${ujianId}_answers`
      const existing = localStorage.getItem(key)
      const answers = existing ? JSON.parse(existing) : {}
      answers[soalId] = { answer_text: answer, saved_at: new Date().toISOString() }
      localStorage.setItem(key, JSON.stringify(answers))
    } catch { /* localStorage may be unavailable */ }
  }, [])

  const loadFromLocal = useCallback((ujianId: string) => {
    try {
      const saved = localStorage.getItem(`ujian_${ujianId}_answers`)
      return saved ? JSON.parse(saved) : {}
    } catch { /* localStorage may be unavailable */ return {} }
  }, [])

  const clearLocal = useCallback((ujianId: string) => {
    try { localStorage.removeItem(`ujian_${ujianId}_answers`) } catch { /* localStorage may be unavailable */ }
  }, [])

  return { saveToLocal, loadFromLocal, clearLocal }
}

export function useDebouncedSubmitJawaban(delay = 2000) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const submitJawaban = useCallback(async (jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('jawaban_siswa')
      .upsert({ ...jawaban, siswa_id: user.id, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (!error && data) {
      queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id] })
    }
  }, [user?.id, queryClient])

  const debouncedSubmit = useCallback((jawaban: Omit<JawabanSiswaInsert, 'siswa_id'>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => submitJawaban(jawaban), delay)
  }, [submitJawaban, delay])

  const cancelPendingSubmit = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [])

  return { debouncedSubmit, cancelPendingSubmit }
}

export function useBatchSubmitJawaban() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (jawabans: Array<{ ujian_id: string; soal_id: string; answer_text: string; attempt_number?: number }>) => {
      if (!user?.id) throw new Error('User not authenticated')

      let attemptNumber = jawabans[0]?.attempt_number
      if (!attemptNumber && jawabans[0]?.ujian_id) {
        const { data: currentAttempt } = await supabase
          .from('ujian_siswa')
          .select('attempt_number')
          .eq('ujian_id', jawabans[0].ujian_id)
          .eq('siswa_id', user.id)
          .eq('status', 'in_progress')
          .order('attempt_number', { ascending: false })
          .limit(1)
          .maybeSingle()
        attemptNumber = currentAttempt?.attempt_number || 1
      }

      const { data: existingJawaban } = await supabase
          .from('jawaban_siswa')
          .select('id, soal_id')
          .eq('ujian_id', jawabans[0].ujian_id)
          .eq('siswa_id', user.id)
          .eq('attempt_number', attemptNumber || 1)

      const jawabanData = jawabans.map(j => {
        const existing = existingJawaban?.find(ej => ej.soal_id === j.soal_id)
        return {
          ...(existing ? { id: existing.id } : {}),
          ujian_id: j.ujian_id, soal_id: j.soal_id, answer_text: j.answer_text,
          siswa_id: user.id, attempt_number: attemptNumber || 1, updated_at: new Date().toISOString(),
        }
      })

      const { data, error } = await supabase.from('jawaban_siswa').upsert(jawabanData).select()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['jawaban'], exact: false, predicate: (q) => q.queryKey.includes('jawaban') && q.queryKey.includes(data?.[0]?.ujian_id) })
      }, 1000)
      data?.forEach(j => checkMultipleChoiceAnswer(j.id, j.soal_id, j.answer_text).catch(() => {}))
      if (data && data.length > 0) {
        setTimeout(() => calculateUjianScore(data[0].ujian_id, data[0].siswa_id, data[0].attempt_number).catch(() => {}), 2000)
      }
    },
  })
}

export function useUpdateJawaban() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & JawabanSiswaUpdate) => {
      const { data, error } = await supabase
        .from('jawaban_siswa')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jawaban'] })
      queryClient.invalidateQueries({ queryKey: ['jawaban', 'ujian', data.ujian_id] })
    },
  })
}

export function useBatchAIGrading() {
  return useMutation({
    mutationFn: async (request: BatchAIGradingRequest) => triggerBatchAIGrading(request.ujianId, request.options),
    onSuccess: (data: BatchAIGradingResponse) => {
      toast.success(`Penilaian selesai! Auto: ${data.autoGradedCount}, AI: ${data.aiGradedCount}`, {
        description: `Hemat biaya: ${data.costSavingsPercent}% • Waktu: ${Math.round(data.processingTimeMs / 1000)}s`,
      })
    },
    onError: (error) => {
      toast.error('Gagal menjalankan penilaian AI secara batch', {
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
      })
    },
  })
}
