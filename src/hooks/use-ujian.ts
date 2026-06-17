import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'
import { useEffect, useRef } from 'react'

const supabase = createClient()

type UjianUpdate = Database['public']['Tables']['ujian']['Update']

// HOOKS UNTUK GURU (TEACHER PERSPECTIVE)

export function useUjian(page = 1, limit = 10) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', page, limit],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const now = new Date().toISOString()
      await supabase
        .from('ujian')
        .update({ status: 'completed', updated_at: now })
        .eq('status', 'active')
        .lt('end_time', now)

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_kelas(kelas_id, kelas(nama_kelas, kode_kelas)),
          guru:guru_id(id, full_name),
          ujian_soal(id, soal_id, urutan, soal!inner(id, question_text, question_type, tags, created_at)),
          ujian_siswa(id, status)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      const processedData = data?.map(ujian => ({
        ...ujian,
        kelas_ids: ujian.ujian_kelas?.map((uk: any) => uk.kelas_id) || [],
        kelas_names: ujian.ujian_kelas?.map((uk: any) => uk.kelas?.nama_kelas).join(', ') || 'Global',
        totalPeserta: ujian.ujian_siswa?.length || 0,
        pesertaAktif: ujian.ujian_siswa?.filter((us: any) => us.status === 'in_progress').length || 0,
        pesertaSelesai: ujian.ujian_siswa?.filter((us: any) => us.status === 'completed').length || 0,
      })) || []

      return { data: processedData, count: count || 0, hasMore: count ? to < count - 1 : false }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  })
}

export function useUjianDetail(id: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('ujian')
        .select(`
          *,
          ujian_soal(id, soal_id, urutan, soal!inner(id, question_text, question_type, options, correct_answer, tags, difficulty_level, created_at))
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id && !!id,
  })
}

export function useCreateUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ name, description, duration_minutes, start_time, end_time, kelas_ids, guru_id, allow_remidi, max_attempts }: {
      name: string; description?: string; duration_minutes: number; start_time: string; end_time: string;
      kelas_ids?: string[]; guru_id: string; allow_remidi?: boolean; max_attempts?: number
    }) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (duration_minutes < 1 || duration_minutes > 480) throw new Error('Durasi ujian harus antara 1-480 menit')

      const { data: ujian, error: ujianError } = await supabase
        .from('ujian')
        .insert({ name, description, duration_minutes, start_time, end_time, created_by: user.id, guru_id, allow_remidi: allow_remidi || false, max_attempts: allow_remidi ? (max_attempts !== undefined ? max_attempts : 2) : 1 })
        .select()
        .single()

      if (ujianError) throw ujianError

      if (kelas_ids && kelas_ids.length > 0) {
        const ujianKelasData = kelas_ids.map(kid => ({
          ujian_id: ujian.id,
          kelas_id: kid
        }))
        const { error: ukError } = await supabase.from('ujian_kelas').insert(ujianKelasData)
        if (ukError) throw ukError
      }

      return ujian
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ujian'] }) },
  })
}

export function useUpdateUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async ({ id, name, description, duration_minutes, start_time, end_time, kelas_ids, guru_id, allow_remidi, max_attempts }: {
      id: string; name: string; description?: string; duration_minutes: number; start_time: string; end_time: string;
      kelas_ids?: string[]; guru_id: string; allow_remidi?: boolean; max_attempts?: number
    }) => {
      if (!user?.id) throw new Error('User not authenticated')
      if (duration_minutes < 1 || duration_minutes > 480) throw new Error('Durasi ujian harus antara 1-480 menit')

      const ujianData: UjianUpdate = { name, description, duration_minutes, start_time, end_time, guru_id, allow_remidi: allow_remidi || false, max_attempts: allow_remidi ? (max_attempts !== undefined ? max_attempts : 2) : 1 }

      const { data: ujian, error: ujianError } = await supabase.from('ujian').update(ujianData).eq('id', id).select().single()
      if (ujianError) throw ujianError

      await supabase.from('ujian_kelas').delete().eq('ujian_id', id)

      if (kelas_ids && kelas_ids.length > 0) {
        const ujianKelasData = kelas_ids.map(kid => ({
          ujian_id: id,
          kelas_id: kid
        }))
        const { error: ukError } = await supabase.from('ujian_kelas').insert(ujianKelasData)
        if (ukError) throw ukError
      }

      return ujian
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ujian'] })
      queryClient.invalidateQueries({ queryKey: ['ujian', data.id] })
    },
  })
}

export function useDeleteUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const { error } = await supabase.from('ujian').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ujian'] }) },
  })
}

export function useSoalForUjian(searchQuery?: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['soal-for-ujian', searchQuery],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      let query = supabase.from('soal').select('id, question_text, question_type, tags, difficulty_level, created_at').eq('created_by', user.id).order('created_at', { ascending: false })
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`question_text.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
  })
}

export function useAddSoalToUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ ujian_id, soal_id, urutan }: { ujian_id: string, soal_id: string, urutan: number }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('ujian_soal')
        .insert({ ujian_id, soal_id, urutan })
        .select()
        .single()

      if (error) throw error

      // Auto-publish: ubah status ke active jika masih draft setelah menambah soal
      const { data: ujianData } = await supabase.from('ujian').select('status').eq('id', ujian_id).single()
      if (ujianData && ujianData.status === 'draft') {
        await supabase.from('ujian').update({ status: 'active' }).eq('id', ujian_id)
      }

      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ujian', variables.ujian_id] })
    },
  })
}

export function useRemoveSoalFromUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ ujian_id, soal_id }: { ujian_id: string, soal_id: string }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('ujian_soal')
        .delete()
        .eq('ujian_id', ujian_id)
        .eq('soal_id', soal_id)

      if (error) throw error
      return { ujian_id, soal_id }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ujian', variables.ujian_id] })
    },
  })
}

export function useStartUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data: currentUjian, error: fetchError } = await supabase.from('ujian').select('duration_minutes').eq('id', id).single()
      if (fetchError) throw fetchError

      const startTime = new Date()
      const durationMinutes = currentUjian.duration_minutes || 60
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

      const { data: ujian, error } = await supabase
        .from('ujian')
        .update({ status: 'active', start_time: startTime.toISOString(), end_time: endTime.toISOString() })
        .eq('id', id).eq('status', 'draft')
        .select().single()

      if (error) throw error
      return ujian
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ujian'] }) },
  })
}

export function useCompleteUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const now = new Date().toISOString()
      const { data: ujian, error } = await supabase
        .from('ujian').update({ status: 'completed', updated_at: now })
        .eq('id', id).eq('status', 'active')
        .select().single()
      if (error) throw error
      return ujian
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ujian'] }) },
  })
}

export function useAutoCompleteExpiredUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('ujian').update({ status: 'completed', updated_at: now })
        .or(`created_by.eq.${user.id},guru_id.eq.${user.id}`).eq('status', 'active').lt('end_time', now).select()
      if (error) throw error
      return data || []
    },
    onSuccess: (data) => { if (data.length > 0) queryClient.invalidateQueries({ queryKey: ['ujian'] }) },
  })
}

export function useUjianStatusChecker() {
  const { user } = useAuthStore()
  const autoComplete = useAutoCompleteExpiredUjian()

  useEffect(() => {
    if (!user?.id || user.role !== 'guru') return
    const interval = setInterval(async () => {
      try { await autoComplete.mutateAsync() } catch (_error: unknown) { /* silently handle */ }
    }, 60000)
    return () => clearInterval(interval)
  }, [user?.id, user?.role, autoComplete])
}

// HOOKS UNTUK SISWA

export function useAvailableUjianForSiswa() {
  const { user } = useAuthStore()
  const query = useQuery({
    queryKey: ['available-ujian-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const { data, error } = await supabase
        .from('ujian').select(`*, ujian_siswa!left(id, status, started_at, submitted_at, siswa_id), ujian_soal(count)`)
        .eq('status', 'active')
      if (error) throw error

      const now = new Date()
      const availableUjian = data?.filter(ujian => {
        if (ujian.end_time && new Date(ujian.end_time) <= now) return false
        const siswaUjian = ujian.ujian_siswa?.find((us: any) => us.siswa_id === user.id)
        if (siswaUjian?.status === 'completed') return false
        return true
      }) || []
      return availableUjian
    },
    enabled: !!user?.id && user.role === 'siswa',
  })
  return query
}

export function useUjianSiswa() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['ujian-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const { data, error } = await supabase
        .from('ujian_siswa').select(`*, ujian!inner(id, name, description, duration_minutes, start_time, end_time, status, ujian_soal(count))`)
        .eq('siswa_id', user.id).order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id && user.role === 'siswa',
  })
}

export function useStartUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const registrationCache = useRef(new Set<string>())

  return useMutation({
    mutationFn: async ({ ujianId, isRemidi = false }: { ujianId: string; isRemidi?: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const cacheKey = `${user.id}-${ujianId}`
      if (registrationCache.current.has(cacheKey)) {
        throw new Error('Anda sudah terdaftar untuk ujian ini')
      }
      registrationCache.current.add(cacheKey)

      try {
        const now = new Date().toISOString()
        const cachedUjianData = queryClient.getQueryData(['ujian', 'siswa', ujianId])
        let ujian

        if (cachedUjianData && typeof cachedUjianData === 'object' && cachedUjianData !== null) {
          ujian = cachedUjianData as any
        } else {
          const { data: ujianData, error: ujianError } = await supabase
            .from('ujian').select('id, name, status, start_time, end_time, allow_remidi, max_attempts')
            .eq('id', ujianId).eq('status', 'active').single()
          if (ujianError) throw new Error('Ujian tidak ditemukan atau sudah tidak aktif')
          ujian = ujianData
        }

        if (ujian.start_time && new Date(ujian.start_time) > new Date()) throw new Error('Ujian belum dimulai')
        if (ujian.end_time && new Date(ujian.end_time) <= new Date()) throw new Error('Ujian sudah berakhir')

        const { data: existingAttempts } = await supabase
          .from('ujian_siswa').select('id, status, attempt_number')
          .eq('ujian_id', ujianId).eq('siswa_id', user.id).order('attempt_number', { ascending: false })

        const hasInProgress = existingAttempts?.some(a => a.status === 'in_progress')
        const completedAttempts = existingAttempts?.filter(a => a.status === 'completed') || []
        const maxAttemptNumber = existingAttempts?.length ? Math.max(...existingAttempts.map(a => a.attempt_number || 1)) : 0

        if (hasInProgress) throw new Error('Anda masih memiliki ujian yang sedang berlangsung')
        if (existingAttempts && existingAttempts.length > 0 && !isRemidi) throw new Error('Anda sudah terdaftar untuk ujian ini')

        if (isRemidi) {
          if (!ujian.allow_remidi) throw new Error('Ujian ini tidak mengizinkan remidi')
          if (completedAttempts.length >= (ujian.max_attempts || 1)) throw new Error(`Anda sudah mencapai batas maksimal ${ujian.max_attempts} percobaan`)
        }

        const nextAttemptNumber = maxAttemptNumber + 1
        const { data: ujianSiswa, error } = await supabase
          .from('ujian_siswa').insert({ ujian_id: ujianId, siswa_id: user.id, status: 'in_progress', started_at: now, attempt_number: nextAttemptNumber })
          .select().single()
        if (error) throw error
        return ujianSiswa
      } catch (error: unknown) {
        registrationCache.current.delete(cacheKey)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-ujian-siswa'] })
      queryClient.invalidateQueries({ queryKey: ['ujian-siswa'] })
      queryClient.invalidateQueries({ queryKey: ['ujian'], predicate: (query) => !query.queryKey.includes('siswa') })
    },
  })
}

export function useSubmitUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async (ujianId: string) => {
      if (!user?.id) throw new Error('User not authenticated')
      const now = new Date().toISOString()
      const { data: ujianSiswa, error } = await supabase
        .from('ujian_siswa').update({ status: 'completed', submitted_at: now })
        .eq('ujian_id', ujianId).eq('siswa_id', user.id).eq('status', 'in_progress')
        .select().single()
      if (error) throw error
      return ujianSiswa
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ujian-siswa'] })
      queryClient.invalidateQueries({ queryKey: ['ujian'], predicate: (query) => !query.queryKey.includes('siswa') })
    },
  })
}

export function useAutoCompleteExpiredUjianSiswa() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      const now = new Date().toISOString()

      const { data: expiredUjianSiswa, error: fetchError } = await supabase
        .from('ujian_siswa').select(`id, ujian_id, started_at, ujian!inner(duration_minutes)`)
        .eq('siswa_id', user.id).eq('status', 'in_progress')
      if (fetchError) throw fetchError

      const toComplete = expiredUjianSiswa?.filter((us: any) => {
        if (!us.started_at || !us.ujian?.duration_minutes) return false
        const startTime = new Date(us.started_at)
        const endTime = new Date(startTime.getTime() + us.ujian.duration_minutes * 60 * 1000)
        return endTime <= new Date()
      }) || []

      if (toComplete.length === 0) return []

      const { data: completedUjian, error } = await supabase
        .from('ujian_siswa').update({ status: 'completed', submitted_at: now })
        .in('id', toComplete.map(us => us.id)).select()
      if (error) throw error
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

export function useUjianSiswaStatusChecker() {
  const { user } = useAuthStore()
  const autoComplete = useAutoCompleteExpiredUjianSiswa()

  useEffect(() => {
    if (!user?.id || user.role !== 'siswa') return

    let interval: NodeJS.Timeout | null = null

    const startChecker = () => {
      if (interval) return
      interval = setInterval(async () => {
        try { await autoComplete.mutateAsync() } catch (_error: unknown) { /* silently handle */ }
      }, 5 * 60 * 1000)
    }

    const stopChecker = () => {
      if (interval) { clearInterval(interval); interval = null }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopChecker()
      else startChecker()
    }

    if (!document.hidden) startChecker()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopChecker()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id, user?.role, autoComplete])
}

export function useUjianStatistics(ujianId: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['ujian-statistics', ujianId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data: ujian, error: ujianError } = await supabase
        .from('ujian').select(`*, ujian_siswa(id, siswa_id, status, started_at, submitted_at, profiles!inner(full_name, email))`)
        .eq('id', ujianId).or(`created_by.eq.${user.id},guru_id.eq.${user.id}`).single()
      if (ujianError) throw ujianError

      const totalSiswa = ujian.ujian_siswa?.length || 0
      const siswaInProgress = ujian.ujian_siswa?.filter((us: any) => us.status === 'in_progress').length || 0
      const siswaCompleted = ujian.ujian_siswa?.filter((us: any) => us.status === 'completed').length || 0
      const siswaNotStarted = ujian.ujian_siswa?.filter((us: any) => us.status === 'not_started').length || 0

      return {
        ujian,
        statistics: { totalSiswa, siswaInProgress, siswaCompleted, siswaNotStarted, completionRate: totalSiswa > 0 ? ((siswaCompleted / totalSiswa) * 100).toFixed(1) : '0' }
      }
    },
    enabled: !!user?.id && !!ujianId && user.role === 'guru',
  })
}
