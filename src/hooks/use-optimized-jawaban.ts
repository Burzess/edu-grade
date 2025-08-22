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
      pendingSubmissions.current.clear()

      console.log('💾 Auto-saving batch:', submissions.length, 'answers')

        // Submit dengan upsert batch untuk efisiensi
        const { error } = await supabase
          .from('jawaban_siswa')
          .upsert(
            submissions.map(s => ({
              ...s,
              siswa_id: user?.id,
              updated_at: new Date().toISOString()
            })),
            { 
              onConflict: 'ujian_id,soal_id,siswa_id',
              ignoreDuplicates: false 
            }
          )

        if (error) {
        console.error('❌ Error in batch auto-save:', error)
        // Re-add failed submissions back to pending
        submissions.forEach(s => {
          pendingSubmissions.current.set(s.soal_id, s)
        })
      } else {
        console.log('✅ Batch auto-save successful')
      }
    } catch (error) {
      console.error('❌ Unexpected error in batch auto-save:', error)
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

// Smart connection management untuk realtime subscriptions
export class OptimizedRealtimeManager {
  private static instance: OptimizedRealtimeManager
  private channels: Map<string, any> = new Map()
  private connectionState: 'connected' | 'connecting' | 'disconnected' = 'disconnected'

  static getInstance(): OptimizedRealtimeManager {
    if (!OptimizedRealtimeManager.instance) {
      OptimizedRealtimeManager.instance = new OptimizedRealtimeManager()
    }
    return OptimizedRealtimeManager.instance
  }

  subscribeToUjianChanges(userId: string, callback: (payload: any) => void): () => void {
    const channelKey = `ujian-changes-${userId}`
    
    if (this.channels.has(channelKey)) {
      console.log('♻️ Reusing existing ujian subscription')
      return () => {} // Return empty cleanup for duplicate subscriptions
    }

    console.log('🔄 Creating new optimized realtime subscription for ujian')
    
    const channel = supabase
      .channel(channelKey)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ujian',
        },
        (payload) => {
          // Throttle realtime updates to prevent spam
          this.throttledCallback(channelKey, payload, callback)
        }
      )
      .subscribe()

    this.channels.set(channelKey, channel)

    // Return cleanup function
    return () => {
      console.log('🔄 Cleaning up optimized realtime subscription')
      const ch = this.channels.get(channelKey)
      if (ch) {
        supabase.removeChannel(ch)
        this.channels.delete(channelKey)
      }
    }
  }

  private throttledCallback = this.throttle((channelKey: string, payload: any, callback: (payload: any) => void) => {
    callback(payload)
  }, 1000) // Throttle to max 1 update per second

  private throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let timeoutId: NodeJS.Timeout | null = null
    let lastExecTime = 0
    
    return ((...args: any[]) => {
      const currentTime = Date.now()
      
      if (currentTime - lastExecTime > delay) {
        func(...args)
        lastExecTime = currentTime
      } else {
        if (timeoutId) clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          func(...args)
          lastExecTime = Date.now()
        }, delay - (currentTime - lastExecTime))
      }
    }) as T
  }

  cleanup() {
    this.channels.forEach((channel, key) => {
      supabase.removeChannel(channel)
    })
    this.channels.clear()
    console.log('🧹 All realtime channels cleaned up')
  }
}

// Hook untuk menggunakan optimized realtime manager
export function useOptimizedRealtimeUjian(userId: string | undefined, onUjianChange: (payload: any) => void) {
  const manager = OptimizedRealtimeManager.getInstance()

  useEffect(() => {
    if (!userId) return

    const cleanup = manager.subscribeToUjianChanges(userId, onUjianChange)
    return cleanup
  }, [userId, onUjianChange, manager])

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      manager.cleanup()
    }
  }, [manager])
}
