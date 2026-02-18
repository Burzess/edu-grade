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
  const lastSubmissionTime = useRef<number>(0)

  const submitBatch = useCallback(async () => {
    // 🚫 DISABLED: Auto-save to database to prevent double submissions
    // This function previously handled auto-saving to database
    // NOW: Only used for force cleanup (but doesn't actually submit to database)
    
    if (pendingSubmissions.current.size > 0) {
      console.log('🗑️ Clearing pending submissions (database auto-save disabled):', pendingSubmissions.current.size)
      pendingSubmissions.current.clear()
    }
    
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    console.log('ℹ️ Auto-save system disabled - only localStorage backup active')
  }, [])

  const debouncedSubmit = useCallback((jawaban: any) => {
    if (!user?.id) return

    // 🚫 DISABLED: Auto-save to database to prevent double submissions
    // Previously: Add to pending submissions and auto-save to database
    // NOW: Only save to localStorage for recovery purposes
    
    console.log('💾 Auto-saving to localStorage only (database auto-save disabled):', {
      soalId: jawaban.soal_id,
      answerLength: jawaban.answer_text?.length || 0
    })
    
    // Save to localStorage for recovery
    try {
      const localKey = `ujian_${jawaban.ujian_id}_answers`
      const existing = localStorage.getItem(localKey)
      const answers = existing ? JSON.parse(existing) : {}
      
      answers[jawaban.soal_id] = {
        answer_text: jawaban.answer_text,
        saved_at: new Date().toISOString(),
        auto_saved: true
      }
      
      localStorage.setItem(localKey, JSON.stringify(answers))
      console.log('✅ Answer auto-saved to localStorage successfully')
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error)
    }
    
    // REMOVED: Database auto-save to prevent duplicate submissions
    // Only final submit will save to database using batch upsert
  }, [user?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // 🚫 DISABLED: Auto-save on unmount to prevent duplicate submissions
      // Previously: Final submit on unmount
      // NOW: Only localStorage cleanup
      console.log('🧹 Cleanup: Auto-save disabled, localStorage preserved for recovery')
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

      // Find the current/latest attempt
      const { data: currentAttempt } = await supabase
        .from('ujian_siswa')
        .select('attempt_number, status')
        .eq('ujian_id', ujianId)
        .eq('siswa_id', user.id)
        .order('attempt_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const attemptNumber = currentAttempt?.attempt_number || 1

      const { data: allJawaban, error } = await supabase
        .from('jawaban_siswa')
        .select(`
          id,
          soal_id,
          answer_text,
          created_at,
          score,
          ai_feedback,
          attempt_number,
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
        .eq('attempt_number', attemptNumber)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!allJawaban) return []

      // Get latest answer per soal_id (within the same attempt)
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
    staleTime: 60000, // DIPERPANJANG: 60 seconds (dari 30 detik)
    gcTime: 300000, // DIPERPANJANG: 5 menit cache (dari default)
    refetchInterval: false, // Tidak perlu auto-refetch
    refetchOnWindowFocus: false, // Tidak refetch ketika focus
    refetchOnMount: false, // TAMBAHAN: Tidak refetch saat mount
    refetchOnReconnect: false, // TAMBAHAN: Tidak refetch saat reconnect
    retry: 1, // TAMBAHAN: Hanya retry 1x
    retryDelay: 5000, // TAMBAHAN: 5 detik delay antar retry
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
