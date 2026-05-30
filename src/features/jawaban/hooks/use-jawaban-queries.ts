/**
 * Jawaban query hooks — fetch jawaban data for display.
 */
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const supabase = createClient()

export function useJawabanByUjian(ujianId: string) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['jawaban', 'ujian', ujianId],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

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
        .select(`*, soal:soal_id (id, question_text, question_type, options, correct_answer, difficulty_level, tags)`)
        .eq('ujian_id', ujianId)
        .eq('siswa_id', user.id)
        .eq('attempt_number', attemptNumber)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!allJawaban || allJawaban.length === 0) return []

      // Deduplicate by soal_id, keep latest
      const latestMap = new Map<string, any>()
      allJawaban.forEach((j: any) => {
        const existing = latestMap.get(j.soal_id)
        if (!existing || new Date(j.created_at) > new Date(existing.created_at)) {
          latestMap.set(j.soal_id, j)
        }
      })

      return Array.from(latestMap.values()).sort((a, b) => a.soal_id.localeCompare(b.soal_id))
    },
    enabled: !!ujianId && !!user?.id,
  })
}

export function useJawabanSiswa() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['jawaban', 'siswa'],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: allJawaban, error } = await supabase
        .from('jawaban_siswa')
        .select(`*, ujian (id, name, description, created_by, profiles (full_name)), soal (id, question_text, question_type)`)
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!allJawaban || allJawaban.length === 0) return []

      // Deduplicate by ujian_id + soal_id, keep latest
      const latestMap = new Map<string, any>()
      allJawaban.forEach((j: any) => {
        const key = `${j.ujian_id}_${j.soal_id}`
        const existing = latestMap.get(key)
        if (!existing || new Date(j.created_at) > new Date(existing.created_at)) {
          latestMap.set(key, j)
        }
      })

      return Array.from(latestMap.values())
        .filter((j: any) => !!j.ujian)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    },
    enabled: !!user?.id,
  })
}

export function useCompletedUjianIds() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', 'completed', 'ids', 'siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: jawabanData, error } = await supabase
        .from('jawaban_siswa')
        .select('ujian_id, created_at')
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const latestAttempts = new Map<string, any>()
      jawabanData?.forEach(j => {
        const existing = latestAttempts.get(j.ujian_id)
        if (!existing || new Date(j.created_at) > new Date(existing.created_at)) {
          latestAttempts.set(j.ujian_id, j)
        }
      })

      return Array.from(latestAttempts.keys())
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
