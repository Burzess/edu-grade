import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useAuthStore } from '@/store/auth'

type BankSoalInsert = Database['public']['Tables']['bank_soal']['Insert']
type BankSoalUpdate = Database['public']['Tables']['bank_soal']['Update']

const supabase = createClient()

export const bankSoalKeys = {
  all: ['bank_soal'] as const,
  lists: () => [...bankSoalKeys.all, 'list'] as const,
  list: (ujian_id: string) => [...bankSoalKeys.lists(), ujian_id] as const,
}

export function useBankSoalList(ujian_id: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: bankSoalKeys.list(ujian_id),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('bank_soal')
        .select('*')
        .eq('ujian_id', ujian_id)
        .eq('created_by', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!user && !!ujian_id,
  })
}

export function useCreateBankSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (soal: Omit<BankSoalInsert, 'created_by'>) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('bank_soal')
        .insert({
          ...soal,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankSoalKeys.list(variables.ujian_id) })
    },
  })
}

export function useUpdateBankSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ujian_id, ...updates }: BankSoalUpdate & { id: string, ujian_id: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('bank_soal')
        .update(updates)
        .eq('id', id)
        .eq('created_by', user.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankSoalKeys.list(variables.ujian_id) })
    },
  })
}

export function useDeleteBankSoal() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id, ujian_id }: { id: string, ujian_id: string }) => {
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('bank_soal')
        .delete()
        .eq('id', id)
        .eq('created_by', user.id)

      if (error) throw error
      return id
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: bankSoalKeys.list(variables.ujian_id) })
    },
  })
}
