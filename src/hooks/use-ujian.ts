import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'
import { useEffect } from 'react'
import { useNotifications } from './use-notifications'

type Ujian = Database['public']['Tables']['ujian']['Row']
type UjianInsert = Database['public']['Tables']['ujian']['Insert']
type UjianUpdate = Database['public']['Tables']['ujian']['Update']
type UjianSoal = Database['public']['Tables']['ujian_soal']['Row']

// Types untuk table ujian_siswa yang baru
type UjianSiswa = Database['public']['Tables']['ujian_siswa']['Row']
type UjianSiswaInsert = Database['public']['Tables']['ujian_siswa']['Insert']
type UjianSiswaUpdate = Database['public']['Tables']['ujian_siswa']['Update']

// HOOKS UNTUK GURU (TEACHER PERSPECTIVE)

// Hook untuk mendapatkan daftar ujian dengan pagination
export function useUjian(page = 1, limit = 10) {
  const { user } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['ujian', page, limit],
    queryFn: async () => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Pertama, update status ujian yang sudah expired
      const now = new Date().toISOString()
      await supabase
        .from('ujian')
        .update({ status: 'completed', updated_at: now })
        .eq('created_by', user.id)
        .eq('status', 'active')
        .lt('end_time', now)

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_soal(
            id,
            soal_id,
            urutan,
            soal!inner(
              id,
              question_text,
              question_type,
              tags,
              created_at
            )
          ),
          ujian_siswa(
            id,
            status
          )
        `, { count: 'exact' })
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw error
      }

      // Proses data untuk menambahkan informasi peserta
      const processedData = data?.map(ujian => ({
        ...ujian,
        totalPeserta: ujian.ujian_siswa?.length || 0,
        pesertaAktif: ujian.ujian_siswa?.filter((us: any) => us.status === 'in_progress').length || 0,
        pesertaSelesai: ujian.ujian_siswa?.filter((us: any) => us.status === 'completed').length || 0,
      })) || []

      return {
        data: processedData,
        count: count || 0,
        hasMore: count ? to < count - 1 : false
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 menit untuk mengurangi request berlebihan
    refetchInterval: false, // Disable auto refetch - will use realtime instead
    refetchIntervalInBackground: false, // Stop refetch ketika tab tidak aktif
  })
}

// Hook untuk mendapatkan detail ujian beserta soal-soalnya
export function useUjianDetail(id: string) {
  const { user } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['ujian', id],
    queryFn: async () => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_soal(
            id,
            soal_id,
            urutan,
            soal!inner(
              id,
              question_text,
              question_type,
              options,
              correct_answer,
              tags,
              difficulty_level,
              created_at
            )
          )
        `)
        .eq('id', id)
        .eq('created_by', user.id)
        .single()

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!user?.id && !!id,
  })
}

// Hook untuk membuat ujian baru
export function useCreateUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      name,
      description,
      duration_minutes,
      selected_soal
    }: {
      name: string
      description?: string
      duration_minutes: number
      selected_soal: string[]
    }) => {
      console.log('📘 Creating new ujian...', {
        name,
        duration: duration_minutes,
        soalCount: selected_soal?.length || 0,
        userId: user?.id
      })

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Validasi durasi
      if (duration_minutes < 1 || duration_minutes > 480) {
        throw new Error('Durasi ujian harus antara 1-480 menit')
      }

      // Insert ujian terlebih dahulu
      const { data: ujian, error: ujianError } = await supabase
        .from('ujian')
        .insert({
          name,
          description,
          duration_minutes,
          created_by: user.id,
        })
        .select()
        .single()

      if (ujianError) {
        throw ujianError
      }

      // Jika ada soal yang dipilih, insert ke ujian_soal
      if (selected_soal && selected_soal.length > 0) {

        const ujianSoalData = selected_soal.map((soal_id: string, index: number) => ({
          ujian_id: ujian.id,
          soal_id,
          urutan: index + 1,
        }))

        const { error: ujianSoalError } = await supabase
          .from('ujian_soal')
          .insert(ujianSoalData)

        if (ujianSoalError) {
          throw ujianSoalError
        }
      }

      return ujian
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
    },
  })
}

// Hook untuk update ujian
export function useUpdateUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      duration_minutes,
      selected_soal
    }: {
      id: string
      name: string
      description?: string
      duration_minutes: number
      selected_soal: string[]
    }) => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Validasi durasi
      if (duration_minutes < 1 || duration_minutes > 480) {
        throw new Error('Durasi ujian harus antara 1-480 menit')
      }

      // Update ujian
      const ujianData: UjianUpdate = {
        name,
        description,
        duration_minutes,
      }

      const { data: ujian, error: ujianError } = await supabase
        .from('ujian')
        .update(ujianData)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single()

      if (ujianError) {
        throw ujianError
      }

      // Hapus ujian_soal lama
      const { error: deleteError } = await supabase
        .from('ujian_soal')
        .delete()
        .eq('ujian_id', id)

      if (deleteError) {
        throw deleteError
      }

      // Insert ujian_soal baru jika ada
      if (selected_soal.length > 0) {
        const ujianSoalData = selected_soal.map((soal_id: string, index: number) => ({
          ujian_id: id,
          soal_id,
          urutan: index + 1,
        }))

        const { error: insertError } = await supabase
          .from('ujian_soal')
          .insert(ujianSoalData)

        if (insertError) {
          throw insertError
        }

        console.log('✅ Ujian soal list updated successfully')
      }

      return ujian
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
      queryClient.invalidateQueries({ queryKey: ['ujian', data.id] })
    },
  })
}

// Hook untuk delete ujian
export function useDeleteUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('ujian')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id)

      if (error) {
        throw error
      }

      console.log('✅ Ujian deleted successfully:', { id })
      return id
    },
    onSuccess: () => {
      console.log('🔄 Invalidating ujian queries after delete')
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
    },
  })
}

// Hook untuk mendapatkan daftar soal yang bisa dipilih untuk ujian
export function useSoalForUjian(searchQuery?: string) {
  const { user } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['soal-for-ujian', searchQuery],
    queryFn: async () => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      let query = supabase
        .from('soal')
        .select('id, question_text, question_type, tags, difficulty_level, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      // Jika ada search query, filter berdasarkan question_text atau tags
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`question_text.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    },
    enabled: !!user?.id,
  })
}

// Hook untuk memulai ujian (mengubah status dari draft ke active)
export function useStartUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()
      console.log('📅 Current time for start ujian:', now)

      // First, get the ujian to access duration_minutes
      const { data: currentUjian, error: fetchError } = await supabase
        .from('ujian')
        .select('duration_minutes')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Calculate end_time based on start_time + duration
      const startTime = new Date()
      const durationMinutes = currentUjian.duration_minutes || 60 // Default 60 minutes
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

      const { data: ujian, error } = await supabase
        .from('ujian')
        .update({
          status: 'active',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(), // Set proper end_time for RLS policy
        })
        .eq('id', id)
        .eq('created_by', user.id)
        .eq('status', 'draft') // Only allow starting draft ujian
        .select()
        .single()

      if (error) {
        throw error
      }

      // Hapus setTimeout karena tidak reliable setelah refresh
      // Auto-complete akan ditangani oleh pengecekan di query hook

      return ujian
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
    },
  })
}

// Hook untuk mengakhiri ujian (mengubah status dari active ke completed)
export function useCompleteUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()

      const { data: ujian, error } = await supabase
        .from('ujian')
        .update({
          status: 'completed',
          updated_at: now
        })
        .eq('id', id)
        .eq('created_by', user.id)
        .eq('status', 'active') // Only allow completing active ujian
        .select()
        .single()

      if (error) {
        throw error
      }

      return ujian
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
    },
  })
}

// Hook untuk auto-complete ujian yang sudah expired
export function useAutoCompleteExpiredUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('ujian')
        .update({ 
          status: 'completed', 
          updated_at: now 
        })
        .eq('created_by', user.id)
        .eq('status', 'active')
        .lt('end_time', now)
        .select()

      if (error) {
        throw error
      }

      console.log('✅ Auto-completed expired ujian:', data?.length || 0)
      return data || []
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['ujian'] })
      }
    },
  })
}

// Hook untuk pengecekan berkala status ujian expired (GURU)
export function useUjianStatusChecker() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const autoComplete = useAutoCompleteExpiredUjian()

  useEffect(() => {
    if (!user?.id || user.role !== 'guru') return

    const interval = setInterval(async () => {
      try {
        await autoComplete.mutateAsync()
      } catch (error) {
        console.error('Error auto-completing expired ujian:', error)
      }
    }, 60000) // Check setiap 1 menit

    return () => clearInterval(interval)
  }, [user?.id, user?.role, autoComplete])
}

// HOOKS UNTUK SISWA (STUDENT PERSPECTIVE)

// Hook untuk mendapatkan daftar ujian yang tersedia untuk siswa
export function useAvailableUjianForSiswa() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { showUjianNotification, permission } = useNotifications()
  const supabase = createClient()

  const query = useQuery({
    queryKey: ['available-ujian-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Get ujian yang statusnya active
      const { data, error } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_siswa!left(
            id,
            status,
            started_at,
            submitted_at,
            siswa_id
          ),
          ujian_soal(count)
        `)
        .eq('status', 'active')

      if (error) {
        throw error
      }

      // Filter ujian yang belum expired dan belum completed oleh siswa
      const now = new Date()
      const availableUjian = data?.filter(ujian => {
        // Check expiry
        if (ujian.end_time && new Date(ujian.end_time) <= now) {
          return false
        }

        // Check if siswa sudah completed ujian ini
        const siswaUjian = ujian.ujian_siswa?.find((us: any) => us.siswa_id === user.id)
        if (siswaUjian?.status === 'completed') {
          return false // Jangan tampilkan jika sudah completed
        }

        return true
      }) || []

      return availableUjian
    },
    enabled: !!user?.id && user.role === 'siswa',
  })

  // TEMPORARY: Disable realtime subscription to stop infinite loops
  // Setup realtime subscription untuk ujian table
  /*
  useEffect(() => {
    if (!user?.id || user.role !== 'siswa') return

    console.log('🔄 Setting up realtime subscription for ujian (siswa)')
    
    const channel = supabase
      .channel('ujian-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ujian',
        },
        (payload) => {
          console.log('📡 Realtime ujian change detected:', payload.eventType, payload.new || payload.old)
          
          // Throttle invalidations - hanya invalidate untuk perubahan penting
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status)) {
            // Hanya invalidate jika ada ujian baru atau status berubah
            queryClient.invalidateQueries({ 
              queryKey: ['available-ujian-siswa', user.id],
              refetchType: 'none' // Jangan langsung refetch, tunggu sampai component membutuhkan
            })
            
            queryClient.invalidateQueries({ 
              queryKey: ['available-ujian-dashboard', user.id],
              refetchType: 'none'
            })
          }
          
          // Show notification jika ada ujian baru dimulai
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newData = payload.new as any
            const oldData = payload.old as any
            
            if (oldData?.status === 'draft' && newData?.status === 'active') {
              // Ujian baru dimulai
              console.log('🎯 Ujian baru dimulai:', newData.name)
              
              // Show notification jika user sudah memberikan permission
              if (permission === 'granted') {
                showUjianNotification(newData.name)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔄 Cleaning up ujian realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.role, queryClient, showUjianNotification, permission])
  */

  return query
}

// Hook untuk mendapatkan ujian yang sedang atau sudah dikerjakan siswa
export function useUjianSiswa() {
  const { user } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['ujian-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('ujian_siswa')
        .select(`
          *,
          ujian!inner(
            id,
            name,
            description,
            duration_minutes,
            start_time,
            end_time,
            status,
            ujian_soal(count)
          )
        `)
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return data || []
    },
    enabled: !!user?.id && user.role === 'siswa',
    refetchInterval: false, // Bergantung pada realtime subscriptions untuk efisiensi
  })
}

// Hook untuk memulai ujian oleh siswa
export function useStartUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (ujianId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()

      // Check apakah ujian masih aktif dan belum expired
      const { data: ujian, error: ujianError } = await supabase
        .from('ujian')
        .select('id, name, status, end_time')
        .eq('id', ujianId)
        .eq('status', 'active')
        .single()

      if (ujianError) {
        throw new Error('Ujian tidak ditemukan atau sudah tidak aktif')
      }

      // Check apakah ujian belum expired
      if (ujian.end_time && new Date(ujian.end_time) <= new Date()) {
        throw new Error('Ujian sudah berakhir')
      }

      // Check apakah siswa sudah pernah mengerjakan ujian ini
      const { data: existingUjianSiswa } = await supabase
        .from('ujian_siswa')
        .select('id, status')
        .eq('ujian_id', ujianId)
        .eq('siswa_id', user.id)
        .maybeSingle() // FIXED: Use maybeSingle() instead of single() to handle no data

      if (existingUjianSiswa) {
        throw new Error('Anda sudah terdaftar untuk ujian ini')
      }

      // Insert record ujian_siswa dengan status in_progress
      const { data: ujianSiswa, error } = await supabase
        .from('ujian_siswa')
        .insert({
          ujian_id: ujianId,
          siswa_id: user.id,
          status: 'in_progress',
          started_at: now,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ Siswa started ujian:', { ujianId, siswaId: user.id })
      return ujianSiswa
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-ujian-siswa'] })
      queryClient.invalidateQueries({ queryKey: ['ujian-siswa'] })
      // FIXED: More specific invalidation to prevent infinite loops
      // Hanya invalidate ujian list untuk guru, tidak untuk siswa yang sedang mengerjakan
      queryClient.invalidateQueries({ 
        queryKey: ['ujian'], 
        predicate: (query) => {
          // Jangan invalidate query ujian siswa yang sedang aktif
          return !query.queryKey.includes('siswa')
        }
      })
    },
  })
}

// Hook untuk submit ujian oleh siswa
export function useSubmitUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (ujianId: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()

      // Update status ujian_siswa menjadi completed
      const { data: ujianSiswa, error } = await supabase
        .from('ujian_siswa')
        .update({
          status: 'completed',
          submitted_at: now,
        })
        .eq('ujian_id', ujianId)
        .eq('siswa_id', user.id)
        .eq('status', 'in_progress') // Hanya bisa submit jika statusnya in_progress
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ Siswa submitted ujian:', { ujianId, siswaId: user.id })
      return ujianSiswa
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ujian-siswa'] })
      // FIXED: More specific invalidation to prevent infinite loops
      // Hanya invalidate ujian list untuk guru, tidak untuk siswa yang sedang mengerjakan
      queryClient.invalidateQueries({ 
        queryKey: ['ujian'], 
        predicate: (query) => {
          // Jangan invalidate query ujian siswa yang sedang aktif
          return !query.queryKey.includes('siswa')
        }
      })
    },
  })
}

// EMERGENCY: Hook untuk mendapatkan detail ujian yang sedang dikerjakan siswa - DISABLED
export function useActiveUjianSiswa(ujianId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['active-ujian-siswa', ujianId, user?.id],
    queryFn: async () => {
      console.log('🚫 useActiveUjianSiswa: BLOCKED to prevent infinite requests')
      return null
    },
    enabled: false, // EMERGENCY: Completely disable this hook
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: false
  })
}


// Hook untuk auto-complete ujian siswa yang sudah expired
export function useAutoCompleteExpiredUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()

      // Get ujian_siswa yang statusnya in_progress dan sudah lewat waktu
      const { data: expiredUjianSiswa, error: fetchError } = await supabase
        .from('ujian_siswa')
        .select(`
          id,
          ujian_id,
          started_at,
          ujian!inner(
            duration_minutes
          )
        `)
        .eq('siswa_id', user.id)
        .eq('status', 'in_progress')

      if (fetchError) {
        throw fetchError
      }

      const toComplete = expiredUjianSiswa?.filter((us: any) => {
        if (!us.started_at || !us.ujian?.duration_minutes) return false
        
        const startTime = new Date(us.started_at)
        const endTime = new Date(startTime.getTime() + us.ujian.duration_minutes * 60 * 1000)
        return endTime <= new Date()
      }) || []

      if (toComplete.length === 0) {
        return []
      }

      // Auto-complete ujian yang expired
      const { data: completedUjian, error } = await supabase
        .from('ujian_siswa')
        .update({
          status: 'completed',
          submitted_at: now,
        })
        .in('id', toComplete.map(us => us.id))
        .select()

      if (error) {
        throw error
      }

      console.log('✅ Auto-completed expired ujian siswa:', completedUjian?.length || 0)
      return completedUjian || []
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['ujian-siswa'] })
        queryClient.invalidateQueries({ queryKey: ['active-ujian-siswa'] })
      }
    },
  })
}

// Hook untuk pengecekan berkala status ujian siswa yang expired
export function useUjianSiswaStatusChecker() {
  const { user } = useAuthStore()
  const autoComplete = useAutoCompleteExpiredUjianSiswa()

  useEffect(() => {
    if (!user?.id || user.role !== 'siswa') return

    // Optimized interval - hanya check setiap 5 menit dan hanya ketika tab aktif
    let interval: NodeJS.Timeout | null = null
    
    const startChecker = () => {
      if (interval) return
      
      interval = setInterval(async () => {
        try {
          await autoComplete.mutateAsync()
        } catch (error) {
          console.error('Error auto-completing expired ujian siswa:', error)
        }
      }, 5 * 60 * 1000) // Check setiap 5 menit
    }

    const stopChecker = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopChecker()
      } else {
        startChecker()
      }
    }

    // Initial setup
    if (!document.hidden) {
      startChecker()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      stopChecker()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, user?.role, autoComplete])
}

// Hook untuk mendapatkan statistik ujian untuk guru
export function useUjianStatistics(ujianId: string) {
  const { user } = useAuthStore()
  const supabase = createClient()

  return useQuery({
    queryKey: ['ujian-statistics', ujianId],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Get ujian detail dengan data siswa yang mengikuti
      const { data: ujian, error: ujianError } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_siswa(
            id,
            siswa_id,
            status,
            started_at,
            submitted_at,
            profiles!inner(
              full_name,
              email
            )
          )
        `)
        .eq('id', ujianId)
        .eq('created_by', user.id)
        .single()

      if (ujianError) {
        throw ujianError
      }

      // Hitung statistik
      const totalSiswa = ujian.ujian_siswa?.length || 0
      const siswaInProgress = ujian.ujian_siswa?.filter((us: any) => us.status === 'in_progress').length || 0
      const siswaCompleted = ujian.ujian_siswa?.filter((us: any) => us.status === 'completed').length || 0
      const siswaNotStarted = ujian.ujian_siswa?.filter((us: any) => us.status === 'not_started').length || 0

      return {
        ujian,
        statistics: {
          totalSiswa,
          siswaInProgress,
          siswaCompleted,
          siswaNotStarted,
          completionRate: totalSiswa > 0 ? ((siswaCompleted / totalSiswa) * 100).toFixed(1) : '0'
        }
      }
    },
    enabled: !!user?.id && !!ujianId && user.role === 'guru',
    refetchInterval: false, // Use realtime subscriptions instead untuk mengurangi load
  })
}
