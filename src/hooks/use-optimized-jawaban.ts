import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'
import { useCallback, useRef, useEffect } from 'react'

const supabase = createClient()

// Optimized hook untuk auto-save jawaban dengan advanced debouncing
export function useOptimizedDebouncedSubmitJawaban() {
  const { user } = useAuthStore()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSubmissions = useRef<Map<string, any>>(new Map())
  const isSubmittingRef = useRef(false)

  const submitBatch = useCallback(async () => {
    if (isSubmittingRef.current || pendingSubmissions.current.size === 0) return

    try {
      isSubmittingRef.current = true
      const submissions = Array.from(pendingSubmissions.current.values())
      const submissionsBackup = [...submissions] // Backup untuk error handling
      pendingSubmissions.current.clear()

      console.log('💾 Auto-saving batch:', submissions.length, 'answers')

        // FIXED: Simplified approach - just insert new answers
        // Tabel jawaban memungkinkan multiple draft, UI akan mengambil yang terbaru
        const { error } = await supabase
          .from('jawaban_siswa')
          .insert(
            submissions.map(s => ({
              ...s,
              siswa_id: user?.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          )

        if (error) {
          console.error('❌ Error in batch auto-save:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          // Re-add failed submissions back to pending untuk retry
          submissionsBackup.forEach(s => {
            pendingSubmissions.current.set(s.soal_id, s)
          })
        } else {
          console.log('✅ Batch auto-save successful:', submissions.length, 'answers')
        }
    } catch (error) {
      console.error('❌ Unexpected error in batch auto-save:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      // Note: submissions variable tidak tersedia di sini, 
      // tapi sudah di-handle di blok if (error) di atas
    } finally {
      isSubmittingRef.current = false
    }
  }, [user?.id])

  const debouncedSubmit = useCallback((jawaban: any) => {
    if (!user?.id) return

    // Add to pending submissions (overwrites previous for same soal_id)
    pendingSubmissions.current.set(jawaban.soal_id, jawaban)

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set new timeout
    timeoutRef.current = setTimeout(submitBatch, 3000) // 3 seconds debounce
  }, [user?.id, submitBatch])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Final submit on unmount
      if (pendingSubmissions.current.size > 0) {
        submitBatch()
      }
    }
  }, [submitBatch])

  return { debouncedSubmit, forceSubmit: submitBatch }
}

// Optimized hook untuk mendapatkan jawaban dengan smart caching
export function useOptimizedJawabanByUjian(ujianId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['jawaban', 'ujian', ujianId, user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data: allJawaban, error } = await supabase
        .from('jawaban_siswa')
        .select(`
          id,
          soal_id,
          answer_text,
          created_at,
          score,
          ai_feedback,
          soal:soal_id (
            id,
            question_text,
            question_type,
            options,
            correct_answer
          )
        `)
        .eq('ujian_id', ujianId)
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!allJawaban) return []

      // Get latest attempt per soal_id
      const latestAnswersMap = new Map()
      allJawaban.forEach((jawaban: any) => {
        const soalId = jawaban.soal_id
        if (!latestAnswersMap.has(soalId) || 
            new Date(latestAnswersMap.get(soalId).created_at) < new Date(jawaban.created_at)) {
          latestAnswersMap.set(soalId, jawaban)
        }
      })

      return Array.from(latestAnswersMap.values())
        .sort((a, b) => a.soal_id.localeCompare(b.soal_id))
    },
    enabled: !!ujianId && !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: false, // Tidak perlu auto-refetch
    refetchOnWindowFocus: false, // Tidak refetch ketika focus
  })
}

// REALTIME REMOVED: OptimizedRealtimeManager dihapus untuk mencegah infinite requests
// Class ini di-disable karena menyebabkan masalah performa dengan 21,000+ requests

// Placeholder class untuk mencegah error pada imports
export class OptimizedRealtimeManager {
  private static instance: OptimizedRealtimeManager

  static getInstance(): OptimizedRealtimeManager {
    if (!OptimizedRealtimeManager.instance) {
      OptimizedRealtimeManager.instance = new OptimizedRealtimeManager()
    }
    return OptimizedRealtimeManager.instance
  }

  subscribeToUjianChanges(userId: string, callback: (payload: any) => void): () => void {
    console.log('🚫 OptimizedRealtimeManager: DISABLED - no realtime subscriptions')
    return () => {} // Return empty cleanup
  }

  cleanup() {
    console.log('� OptimizedRealtimeManager.cleanup(): DISABLED')
  }
}

// Hook placeholder untuk mencegah error
export function useOptimizedRealtimeUjian(userId: string | undefined, onUjianChange: (payload: any) => void) {
  console.log('🚫 useOptimizedRealtimeUjian: DISABLED')
}
