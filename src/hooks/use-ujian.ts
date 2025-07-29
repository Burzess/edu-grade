import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { Database } from '@/types/database'

const supabase = createClient()

type Ujian = Database['public']['Tables']['ujian']['Row']
type UjianInsert = Database['public']['Tables']['ujian']['Insert']
type UjianUpdate = Database['public']['Tables']['ujian']['Update']
type UjianSoal = Database['public']['Tables']['ujian_soal']['Row']

// Hook untuk mendapatkan daftar ujian dengan pagination
export function useUjian(page = 1, limit = 10) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', page, limit],
    queryFn: async () => {

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

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
          )
        `, { count: 'exact' })
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        throw error
      }

      return {
        data: data || [],
        count: count || 0,
        hasMore: count ? to < count - 1 : false
      }
    },
    enabled: !!user?.id,
  })
}

// Hook untuk mendapatkan detail ujian beserta soal-soalnya
export function useUjianDetail(id: string) {
  const { user } = useAuthStore()

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

// Hook alternatif untuk debug - tanpa join
export function useUjianWithSeparateQueries(page = 1, limit = 10) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian-debug', page, limit],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      // First, get ujian list
      const { data: ujianList, error: ujianError, count } = await supabase
        .from('ujian')
        .select('*', { count: 'exact' })
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (ujianError) {
        throw ujianError
      }

      // Then, for each ujian, get its soal
      const ujianWithSoal = await Promise.all(
        ujianList.map(async (ujian) => {
          // Get ujian_soal relationships
          const { data: ujianSoalList, error: ujianSoalError } = await supabase
            .from('ujian_soal')
            .select('id, soal_id, urutan')
            .eq('ujian_id', ujian.id)
            .order('urutan', { ascending: true })

          if (ujianSoalError) {
            return { ...ujian, ujian_soal: [] }
          }

          // Get soal details
          if (ujianSoalList && ujianSoalList.length > 0) {
            const soalIds = ujianSoalList.map(us => us.soal_id)
            const { data: soalList, error: soalError } = await supabase
              .from('soal')
              .select('id, question_text, question_type, tags, created_at')
              .in('id', soalIds)

            if (soalError) {
              return {
                ...ujian,
                ujian_soal: ujianSoalList.map(us => ({ ...us, soal: null }))
              }
            }

            // Combine ujian_soal with soal data
            const ujianSoalWithSoal = ujianSoalList.map(us => {
              const soal = soalList.find(s => s.id === us.soal_id)
              return { ...us, soal }
            })

            return { ...ujian, ujian_soal: ujianSoalWithSoal }
          } else {
            return { ...ujian, ujian_soal: [] }
          }
        })
      )

      return {
        data: ujianWithSoal || [],
        count: count || 0,
        hasMore: count ? to < count - 1 : false
      }
    },
    enabled: !!user?.id,
  })
}

// Hook untuk memulai ujian (mengubah status dari draft ke active)
export function useStartUjian() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

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

      // Setup auto-complete timer untuk ujian ini
      if (ujian.end_time) {
        const endTime = new Date(ujian.end_time)
        const now = new Date()
        const timeUntilEnd = endTime.getTime() - now.getTime()

        if (timeUntilEnd > 0) {
          setTimeout(async () => {
            try {
              const { error: completeError } = await supabase
                .from('ujian')
                .update({
                  status: 'completed',
                  updated_at: new Date().toISOString()
                })
                .eq('id', ujian.id)
                .eq('status', 'active') // Only complete if still active
            } catch (error) {
            }
          }, timeUntilEnd)
        }
      }

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
