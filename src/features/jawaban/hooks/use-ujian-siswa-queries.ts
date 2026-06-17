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
      type JawabanData = { id: string; ujian_id: string; siswa_id: string; score: number | null; created_at: string };
      const latestMap = new Map<string, JawabanData[]>()
      allJawaban.forEach((j) => {
        const jawaban = j as JawabanData;
        if (!latestMap.has(jawaban.ujian_id)) latestMap.set(jawaban.ujian_id, [])
        latestMap.get(jawaban.ujian_id)!.push(jawaban)
      })

      // For each ujian, filter to latest session (within 1 min window)
      const latestAttemptJawaban: JawabanData[] = []
      latestMap.forEach((jawabans) => {
        const sorted = jawabans.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latestDate = sorted[0].created_at
        const sessionJawaban = sorted.filter((j) => Math.abs(new Date(j.created_at).getTime() - new Date(latestDate).getTime()) < 60000)
        latestAttemptJawaban.push(...sessionJawaban)
      })

      const ujianIds = [...new Set(latestAttemptJawaban.map(j => j.ujian_id))]

      const { data: ujianData, error: ujianError } = await supabase
        .from('ujian')
        .select(`id, name, description, status, duration_minutes, start_time, end_time, created_by, guru_id, created_at`)
        .in('id', ujianIds)

      if (ujianError) throw ujianError
      if (!ujianData || ujianData.length === 0) return []

      const profileIds = [...new Set(ujianData.map(u => u.guru_id || u.created_by).filter(Boolean))];
      const profilesMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
        if (profiles) {
            profiles.forEach(p => { profilesMap[p.id] = p.full_name || 'Tidak diketahui'; });
        }
      }

      return ujianData.map(ujian => {
        const jawabanForUjian = latestAttemptJawaban.filter(j => j.ujian_id === ujian.id)
        const scores = jawabanForUjian.filter(j => j.score !== null).map(j => j.score as number)
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((s, sc) => s + sc, 0) / scores.length) : null
        const lastAttempt = jawabanForUjian.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
        const guru_name = profilesMap[ujian.guru_id || ujian.created_by] || 'Tidak diketahui'
        return { ...ujian, totalAnswers: jawabanForUjian.length, gradedAnswers: scores.length, averageScore, lastAttempt, guru_name, profiles: { full_name: guru_name } }
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
        .select(`ujian_id, created_at, ujian!inner (*)`)
        .eq('siswa_id', user.id)
        .in('ujian.status', ['active', 'draft'])

      if (error) throw error
      if (!jawabanData || jawabanData.length === 0) return []

      const profileIds = [...new Set(jawabanData.map(j => {
        const u = j.ujian as unknown as Record<string, unknown>;
        return (u.guru_id as string) || (u.created_by as string);
      }).filter(Boolean))];
      const profilesMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
        if (profiles) {
            profiles.forEach(p => { profilesMap[p.id] = p.full_name || 'Tidak diketahui'; });
        }
      }

      type UjianMapType = Record<string, unknown> & { id: string; guru_name?: string; profiles?: { full_name: string }; lastAttempt: string; guru_id?: string; created_by?: string; };
      const ujianMap = new Map<string, UjianMapType>()
      jawabanData.forEach(item => {
        const ujian = item.ujian as unknown as UjianMapType
        const guru_name = profilesMap[(ujian.guru_id as string) || (ujian.created_by as string)] || 'Tidak diketahui'
        ujian.guru_name = guru_name
        ujian.profiles = { full_name: guru_name }
        if (!ujianMap.has(ujian.id) || new Date(item.created_at) > new Date(ujianMap.get(ujian.id)!.lastAttempt)) {
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

      const latestAttempts = new Map<string, { ujian_id: string; created_at: string }>()
      jawabanData?.forEach((j) => {
        const jawaban = j as { ujian_id: string; created_at: string };
        if (!latestAttempts.has(jawaban.ujian_id) || new Date(jawaban.created_at) > new Date(latestAttempts.get(jawaban.ujian_id)!.created_at)) {
          latestAttempts.set(jawaban.ujian_id, jawaban)
        }
      })
      const answeredIds = Array.from(latestAttempts.keys())

      const query = supabase.from('ujian').select(`*`).order('created_at', { ascending: false })
      if (answeredIds.length > 0) query.not('id', 'in', `(${answeredIds.join(',')})`)

      const { data, error } = await query
      if (error) return []
      
      const ujianList = data || [];
      const profileIds = [...new Set(ujianList.map(u => u.guru_id || u.created_by).filter(Boolean))];
      const profilesMap: Record<string, string> = {};
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
        if (profiles) {
            profiles.forEach(p => { profilesMap[p.id] = p.full_name || 'Tidak diketahui'; });
        }
      }

      return ujianList.map(ujian => {
        const guru_name = profilesMap[ujian.guru_id || ujian.created_by] || 'Tidak diketahui'
        return { ...ujian, guru_name, profiles: { full_name: guru_name } }
      })
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
          .from('ujian').select(`*`).eq('id', ujianId).maybeSingle()
        if (ujianError) {
          console.error('[useUjianForSiswa] Error fetching ujian:', ujianError);
          throw ujianError;
        }
        if (!ujianData) return null

        const { data: ujianSoalData, error: ujianSoalError } = await supabase
          .from('ujian_soal').select('id, soal_id, urutan').eq('ujian_id', ujianId).order('urutan', { ascending: true })
        if (ujianSoalError) throw ujianSoalError

        type UjianSoalItem = { id: string; soal_id: string; urutan: number; soal: Record<string, unknown> | null };
        let ujianSoalWithSoal: UjianSoalItem[] = []
        if (ujianSoalData && ujianSoalData.length > 0) {
          const soalIds = ujianSoalData.map(us => us.soal_id)
          const { data: soalData } = await supabase.from('soal').select('id, question_text, question_type, options, tags').in('id', soalIds)
          ujianSoalWithSoal = ujianSoalData.map(us => ({ ...us, soal: (soalData?.find(s => s.id === us.soal_id) || null) as Record<string, unknown> | null }))
        }

        let guru_name = 'Tidak diketahui';
        const profileId = ujianData.guru_id || ujianData.created_by;
        if (profileId) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', profileId).maybeSingle();
            if (profile) guru_name = profile.full_name || 'Tidak diketahui';
        }

        circuitBreaker.onSuccess()
        return { ...ujianData, guru_name, profiles: { full_name: guru_name }, ujian_soal: ujianSoalWithSoal }
      } catch (err) {
        console.error('[useUjianForSiswa] Caught error:', err);
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
