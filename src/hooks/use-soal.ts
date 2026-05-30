import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useAuthStore } from '@/store/auth'

type SoalInsert = Database['public']['Tables']['soal']['Insert']
type SoalUpdate = Database['public']['Tables']['soal']['Update']

const supabase = createClient()

// Query Keys
export const soalKeys = {
  all: ['soal'] as const,
  lists: () => [...soalKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...soalKeys.lists(), filters] as const,
  details: () => [...soalKeys.all, 'detail'] as const,
  detail: (id: string) => [...soalKeys.details(), id] as const,
}

// Get all soal with pagination and filters
export function useSoalList(params?: {
  page?: number
  limit?: number
  search?: string
  tags?: string[]
  difficulty?: string
}) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: soalKeys.list(params || {}),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')

      let query = supabase
        .from('soal')
        .select('*', { count: 'exact' })
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (params?.search) {
        query = query.ilike('question_text', `%${params.search}%`)
      }

      if (params?.tags && params.tags.length > 0) {
        query = query.overlaps('tags', params.tags)
      }

      if (params?.difficulty && params.difficulty !== 'all') {
        query = query.eq('difficulty_level', params.difficulty)
      }

      const page = params?.page || 1
      const limit = params?.limit || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: data || [],
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    },
    enabled: !!user,
  })
}

// Get single soal by ID
export function useSoal(id: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: soalKeys.detail(id),
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('soal')
        .select('*')
        .eq('id', id)
        .eq('created_by', user.id)
        .single()

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!user && !!id,
  })
}

// Alias untuk useSoal (untuk konsistensi naming)
export const useSoalDetail = useSoal

// Create new soal
export function useCreateSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (soal: Omit<SoalInsert, 'created_by'>) => {
      if (!user) throw new Error('User not authenticated')

      const { ...baseData } = soal

      const insertData = {
        ...baseData,
        created_by: user.id,
      }

      const { data, error } = await supabase
        .from('soal')
        .insert({
          ...soal,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('soal')
          .insert(insertData)
          .select()
          .single()

        if (fallbackError) {
          throw fallbackError
        }

        return fallbackData
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soalKeys.lists() })
    },
  })
}

// Update soal
export function useUpdateSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ...updates }: SoalUpdate & { id: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('soal')
        .update(updates)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: soalKeys.lists() })
      queryClient.invalidateQueries({ queryKey: soalKeys.detail(data.id) })
    },
  })
}

// Delete soal
export function useDeleteSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('soal')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: soalKeys.lists() })
    },
  })
}

// Get unique tags for filter
export function useSoalTags() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [...soalKeys.all, 'tags'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('soal')
        .select('tags')
        .eq('created_by', user.id)
        .not('tags', 'is', null)

      if (error) throw error

      const allTags = data
        .flatMap(item => item.tags || [])
        .filter((tag, index, array) => array.indexOf(tag) === index)
        .sort()

      return allTags
    },
    enabled: !!user,
  })
}
