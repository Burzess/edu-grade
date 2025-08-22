import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useCallback, useRef } from 'react'

const supabase = createClient()

// Optimized hook untuk mendapatkan status ujian dengan debouncing
export function useOptimizedUjianStatus(ujianId: string) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['ujian', 'status', ujianId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('ujian')
        .select('id, name, status, end_time')
        .eq('id', ujianId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!ujianId,
    staleTime: 5 * 60 * 1000, // 5 menit - mengurangi request berlebihan
    refetchInterval: (query) => {
      // Dynamic interval berdasarkan status ujian
      // Akses data dari query.state.data
      const ujianData = query.state.data as any
      if (ujianData?.status === 'active') {
        return 2 * 60 * 1000 // 2 menit untuk ujian aktif
      }
      return false // Tidak refetch untuk ujian completed/draft
    },
    refetchIntervalInBackground: false, // Stop refetch ketika tab tidak aktif
  })
}

// Optimized hook untuk submit jawaban dengan rate limiting
export function useOptimizedSubmitJawaban() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const submitCountRef = useRef(0)
  const lastSubmitTimeRef = useRef(0)

  return useMutation({
    mutationFn: async (jawaban: any) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Rate limiting: max 5 submisi per detik
      const now = Date.now()
      if (now - lastSubmitTimeRef.current < 200 && submitCountRef.current >= 5) {
        throw new Error('Terlalu banyak submit bersamaan, silakan tunggu sebentar')
      }

      if (now - lastSubmitTimeRef.current > 1000) {
        submitCountRef.current = 0
        lastSubmitTimeRef.current = now
      }

      submitCountRef.current++

      console.log('📝 Submitting jawaban:', { soal_id: jawaban.soal_id })

      const { data, error } = await supabase
        .from('jawaban_siswa')
        .upsert({
          ...jawaban,
          siswa_id: user.id,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Optimized cache invalidation - hanya invalidate yang perlu
      queryClient.invalidateQueries({ 
        queryKey: ['jawaban', 'ujian', data.ujian_id],
        exact: false 
      })
    },
    retry: (failureCount, error: any) => {
      // Retry logic untuk network errors
      if (error?.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
        return failureCount < 2
      }
      return failureCount < 1
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000)
  })
}

// Optimized batch submit dengan chunking untuk menghindari overwhelming server
export function useOptimizedBatchSubmitJawaban() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const singleSubmit = useOptimizedSubmitJawaban()

  return useMutation({
    mutationFn: async (submissions: any[]) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (!submissions || submissions.length === 0) {
        throw new Error('Tidak ada jawaban untuk disubmit')
      }

      console.log('📤 Starting optimized batch submit:', submissions.length, 'answers')

      // Chunking submissions untuk menghindari overwhelming server
      const CHUNK_SIZE = 3 // Kirim maksimal 3 sekaligus
      const chunks = []
      for (let i = 0; i < submissions.length; i += CHUNK_SIZE) {
        chunks.push(submissions.slice(i, i + CHUNK_SIZE))
      }

      const results = []
      
      // Submit chunk by chunk dengan delay
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        console.log(`📝 Submitting chunk ${i + 1}/${chunks.length} (${chunk.length} items)`)

        // Submit chunk dengan Promise.allSettled
        const chunkResults = await Promise.allSettled(
          chunk.map(submission => singleSubmit.mutateAsync(submission))
        )

        results.push(...chunkResults)

        // Delay antar chunk untuk mengurangi load server
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Check for failures
      const failures = results.filter(r => r.status === 'rejected')
      const successes = results.filter(r => r.status === 'fulfilled').map(r => (r as any).value)

      console.log('✅ Batch submit completed:', {
        total: submissions.length,
        successful: successes.length,
        failed: failures.length
      })

      if (failures.length > 0) {
        console.warn('⚠️ Some submissions failed:', failures)
      }

      return {
        successful: successes,
        failed: failures,
        totalSubmitted: successes.length
      }
    }
  })
}

// Optimized status checker dengan smart intervals
export function useOptimizedUjianStatusChecker() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(false)

  const checkExpiredUjian = useCallback(async () => {
    if (!user?.id || isActiveRef.current) return

    try {
      isActiveRef.current = true
      
      const { data: expiredUjianSiswa, error } = await supabase
        .from('ujian_siswa')
        .select(`
          id,
          ujian_id,
          started_at,
          ujian!inner(duration_minutes)
        `)
        .eq('siswa_id', user.id)
        .eq('status', 'in_progress')

      if (error || !expiredUjianSiswa) return

      const now = new Date()
      const toComplete = expiredUjianSiswa.filter((us: any) => {
        if (!us.started_at || !us.ujian?.duration_minutes) return false
        
        const startTime = new Date(us.started_at)
        const endTime = new Date(startTime.getTime() + us.ujian.duration_minutes * 60 * 1000)
        return endTime <= now
      })

      if (toComplete.length > 0) {
        console.log('⏰ Auto-completing expired ujian siswa:', toComplete.length)
        
        const { error: updateError } = await supabase
          .from('ujian_siswa')
          .update({
            status: 'completed',
            submitted_at: now.toISOString(),
          })
          .in('id', toComplete.map(us => us.id))

        if (!updateError) {
          queryClient.invalidateQueries({ queryKey: ['ujian'] })
        }
      }
    } catch (error) {
      console.error('Error in optimized status checker:', error)
    } finally {
      isActiveRef.current = false
    }
  }, [user?.id, queryClient])

  useEffect(() => {
    if (!user?.id || user.role !== 'siswa') return

    // Smart interval - lebih panjang dan hanya ketika diperlukan
    const startInterval = () => {
      if (intervalRef.current) return
      
      intervalRef.current = setInterval(checkExpiredUjian, 5 * 60 * 1000) // 5 menit
    }

    const stopInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Mulai checker ketika tab aktif
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopInterval()
      } else {
        startInterval()
        checkExpiredUjian() // Check immediately when tab becomes active
      }
    }

    // Initial setup
    if (!document.hidden) {
      startInterval()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopInterval()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, user?.role, checkExpiredUjian])
}

// Optimized hook untuk mendapatkan ujian dengan smart caching
export function useOptimizedAvailableUjian() {
  const { user } = useAuthStore()
  
  return useQuery({
    queryKey: ['ujian', 'available', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      // Get answered ujian IDs dengan limit untuk performa
      const { data: jawabanData } = await supabase
        .from('jawaban_siswa')
        .select('ujian_id, created_at')
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) // Limit untuk performa

      const answeredUjianIds = [...new Set(jawabanData?.map(j => j.ujian_id) || [])]

      // Fetch ujian dengan optimized query
      let query = supabase
        .from('ujian')
        .select(`
          id,
          name,
          description,
          status,
          duration_minutes,
          start_time,
          end_time,
          created_at,
          profiles!created_by(full_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (answeredUjianIds.length > 0) {
        query = query.not('id', 'in', `(${answeredUjianIds.join(',')})`)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 menit
    refetchInterval: false, // Tidak auto-refetch, bergantung pada realtime
    refetchIntervalInBackground: false,
  })
}
