/**
 * Ujian-siswa status query hooks — completed, in-progress, available, detail.
 */
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useCircuitBreaker, useRateLimiter } from '@/hooks/use-circuit-breaker'

const supabase = createClient()

export function useCompletedUjianSiswa() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', 'completed', 'siswa'],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: allJawaban, error: jawabanError } = await supabase
        .from('jawaban_siswa')
        .select('id, ujian_id, siswa_id, score, created_at')
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (jawabanError) throw jawabanError
      if (!allJawaban || allJawaban.length === 0) return []

      // Group by ujian, keep latest attempt per ujian
      const latestMap = new Map<string, any[]>()
      allJawaban.forEach((j: any) => {
        if (!latestMap.has(j.ujian_id)) latestMap.set(j.ujian_id, [])
        latestMap.get(j.ujian_id)!.push(j)
      })

      // For each ujian, filter to latest session (within 1 min window)
      const latestAttemptJawaban: any[] = []
      latestMap.forEach((jawabans) => {
        const sorted = jawabans.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latestDate = sorted[0].created_at
        const sessionJawaban = sorted.filter((j: any) => Math.abs(new Date(j.created_at).getTime() - new Date(latestDate).getTime()) < 60000)
        latestAttemptJawaban.push(...sessionJawaban)
      })

      const ujianIds = [...new Set(latestAttemptJawaban.map(j => j.ujian_id))]

      const { data: ujianData, error: ujianError } = await supabase
        .from('ujian')
        .select(`id, name, description, status, duration_minutes, start_time, end_time, created_by, created_at, profiles!created_by (full_name)`)
        .in('id', ujianIds)

      if (ujianError) throw ujianError
      if (!ujianData || ujianData.length === 0) return []

      return ujianData.map(ujian => {
        const jawabanForUjian = latestAttemptJawaban.filter(j => j.ujian_id === ujian.id)
        const scores = jawabanForUjian.filter(j => j.score !== null).map(j => j.score)
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length) : null
        const lastAttempt = jawabanForUjian.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
        return { ...ujian, totalAnswers: jawabanForUjian.length, gradedAnswers: scores.length, averageScore, lastAttempt }
      }).sort((a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime())
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export function useInProgressUjianSiswa() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', 'in-progress', 'siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: jawabanData, error } = await supabase
        .from('jawaban_siswa')
        .select(`ujian_id, created_at, ujian!inner (id, name, description, status, duration_minutes, start_time, end_time, created_by, profiles!created_by (full_name))`)
        .eq('siswa_id', user.id)
        .in('ujian.status', ['active', 'draft'])

      if (error) throw error
      if (!jawabanData || jawabanData.length === 0) return []

      const ujianMap = new Map()
      jawabanData.forEach(item => {
        const ujian = item.ujian as any
        if (!ujianMap.has(ujian.id) || new Date(item.created_at) > new Date(ujianMap.get(ujian.id).lastAttempt)) {
          ujianMap.set(ujian.id, { ...ujian, lastAttempt: item.created_at })
        }
      })

      return Array.from(ujianMap.values())
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: false,
  })
}

export function useAvailableUjian() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['ujian', 'available', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data: jawabanData, error: jawabanError } = await supabase
        .from('jawaban_siswa')
        .select('ujian_id, created_at')
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })

      if (jawabanError) return []

      const latestAttempts = new Map()
      jawabanData?.forEach((j: any) => {
        if (!latestAttempts.has(j.ujian_id) || new Date(j.created_at) > new Date(latestAttempts.get(j.ujian_id).created_at)) {
          latestAttempts.set(j.ujian_id, j)
        }
      })
      const answeredIds = Array.from(latestAttempts.keys())

      const query = supabase.from('ujian').select(`*, profiles!created_by (full_name)`).order('created_at', { ascending: false })
      if (answeredIds.length > 0) query.not('id', 'in', `(${answeredIds.join(',')})`)

      const { data, error } = await query
      if (error) return []
      return data || []
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 5000,
  })
}

export function useUjianForSiswa(ujianId: string) {
  const { user } = useAuthStore()
  const circuitBreaker = useCircuitBreaker({ maxFailures: 3, resetTimeout: 60000, failureThreshold: 2 })
  const rateLimiter = useRateLimiter(3, 60000)

  return useQuery({
    queryKey: ['ujian', 'siswa', ujianId],
    queryFn: async () => {
      if (!circuitBreaker.canExecute() || !rateLimiter.canExecute()) return null
      if (!user?.id || !ujianId) return null

      try {
        const { data: ujianData, error: ujianError } = await supabase
          .from('ujian').select(`*, kelas_id, profiles (full_name)`).eq('id', ujianId).maybeSingle()
        if (ujianError) throw ujianError
        if (!ujianData) return null

        const { data: ujianSoalData, error: ujianSoalError } = await supabase
          .from('ujian_soal').select('id, soal_id, urutan').eq('ujian_id', ujianId).order('urutan', { ascending: true })
        if (ujianSoalError) throw ujianSoalError

        let ujianSoalWithSoal: any[] = []
        if (ujianSoalData && ujianSoalData.length > 0) {
          const soalIds = ujianSoalData.map(us => us.soal_id)
          const { data: soalData } = await supabase.from('soal').select('id, question_text, question_type, options, tags').in('id', soalIds)
          ujianSoalWithSoal = ujianSoalData.map(us => ({ ...us, soal: soalData?.find(s => s.id === us.soal_id) || null }))
        }

        circuitBreaker.onSuccess()
        return { ...ujianData, ujian_soal: ujianSoalWithSoal }
      } catch {
        circuitBreaker.onFailure()
        return null
      }
    },
    enabled: !!ujianId && !!user?.id && ujianId.length > 0,
    staleTime: 60 * 60 * 1000,
    gcTime: 90 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    retryDelay: 10000,
  })
}
