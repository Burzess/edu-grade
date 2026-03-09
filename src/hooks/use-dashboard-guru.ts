import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

export interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  time: Date
  ujianId?: string
}

// Hook untuk mendapatkan statistik dashboard guru
export const useDashboardStats = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const supabase = createClient()

      // Gunakan RPC function untuk statistik ujian guru
      const { data: stats, error: rpcError } = await supabase.rpc('ambil_statistik_ujian_guru')
      
      // Query untuk mendapatkan statistik ujian
      const { data: ujianStats, error: ujianError } = await supabase
        .from('ujian')
        .select('id, status, created_at')
        .eq('created_by', user.id)

      if (ujianError) throw ujianError

      // Query untuk mendapatkan total siswa yang pernah mengikuti ujian guru ini dari ujian_siswa
      const { data: ujianSiswaStats, error: ujianSiswaError } = await supabase
        .from('ujian_siswa')
        .select(`
          siswa_id,
          status,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)

      // Jangan throw error jika tabel ujian_siswa belum ada data

      // Query untuk mendapatkan rata-rata nilai dari jawaban_siswa
      const { data: nilaiStats, error: nilaiError } = await supabase
        .from('jawaban_siswa')
        .select(`
          score,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)
        .not('score', 'is', null)

      // Jangan throw error jika tabel jawaban_siswa belum ada data

      // Alternatif: coba query dari tabel jawaban jika jawaban_siswa tidak ada
      let backupNilaiStats = null
      const { data: backupNilai, error: backupNilaiError } = await supabase
        .from('jawaban')
        .select(`
          score,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)
        .not('score', 'is', null)

      if (!backupNilaiError && backupNilai) {
        backupNilaiStats = backupNilai
      }

      // Hitung statistik - prioritaskan dari RPC function jika ada
      const totalUjian = stats?.[0]?.total_ujian || ujianStats?.length || 0
      const activeUjian = stats?.[0]?.ujian_aktif || ujianStats?.filter((u: any) => u.status === 'active').length || 0
      const completedUjian = stats?.[0]?.ujian_selesai || ujianStats?.filter((u: any) => u.status === 'completed').length || 0
      const draftUjian = stats?.[0]?.ujian_draft || ujianStats?.filter((u: any) => u.status === 'draft').length || 0
      
      // Unique siswa count dari ujian_siswa (fallback ke 0 jika tidak ada data)
      const uniqueSiswa = ujianSiswaStats?.length ? new Set(ujianSiswaStats.map((us: any) => us.siswa_id)).size : 0
      
      // Siswa yang sedang mengerjakan ujian
      const siswaAktif = ujianSiswaStats?.filter((us: any) => us.status === 'in_progress').length || 0
      
      // Average score calculation - gunakan backup jika perlu
      const scoreData = nilaiStats || backupNilaiStats || []
      const validScores = scoreData.filter((n: any) => n.score !== null).map((n: any) => n.score)
      const averageScore = validScores.length > 0 
        ? Math.round(validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length)
        : null

      return {
        totalUjian,
        activeUjian,
        completedUjian,
        draftUjian,
        totalSiswa: uniqueSiswa,
        siswaAktif,
        averageScore,
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook untuk mendapatkan aktivitas terbaru
export const useRecentActivity = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      const supabase = createClient()

      // Query untuk ujian terbaru yang dibuat
      const { data: recentUjian, error: ujianError } = await supabase
        .from('ujian')
        .select('id, name, created_at, status')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (ujianError) throw ujianError

      // Query untuk aktivitas siswa terbaru dari ujian_siswa
      const { data: recentUjianSiswa, error: ujianSiswaError } = await supabase
        .from('ujian_siswa')
        .select(`
          id,
          status,
          started_at,
          submitted_at,
          ujian!inner(
            id,
            name,
            created_by
          ),
          profiles!inner(
            full_name,
            email
          )
        `)
        .eq('ujian.created_by', user.id)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(10)

      // Jangan throw error, lanjutkan dengan data kosong

      // Query untuk jawaban terbaru yang masuk dari jawaban_siswa
      const { data: recentJawaban, error: jawabanError } = await supabase
        .from('jawaban_siswa')
        .select(`
          id,
          created_at,
          ujian!inner(name, created_by),
          profiles!inner(full_name)
        `)
        .eq('ujian.created_by', user.id)
        .order('created_at', { ascending: false })

      // Coba gunakan tabel jawaban sebagai fallback jika jawaban_siswa error

      // Fallback: coba query dari tabel jawaban jika jawaban_siswa tidak ada
      let backupJawaban = null
      if (jawabanError || !recentJawaban) {
        const { data: backupJawabanData, error: backupJawabanError } = await supabase
          .from('jawaban')
          .select(`
            id,
            created_at,
            ujian!inner(name, created_by),
            profiles!inner(full_name)
          `)
          .eq('ujian.created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(3)

        if (!backupJawabanError && backupJawabanData) {
          backupJawaban = backupJawabanData
        }
      }

      // Format aktivitas
      const activities: ActivityItem[] = []

      // Tambahkan ujian terbaru
      if (recentUjian && recentUjian.length > 0) {
        recentUjian.forEach((ujian: any) => {
          activities.push({
            id: `ujian-${ujian.id}`,
            type: ujian.status === 'active' ? 'ujian_aktif' : 'ujian_dibuat',
            title: ujian.name,
            description: ujian.status === 'active' ? 'Ujian sedang berlangsung' : 'Ujian baru dibuat',
            time: new Date(ujian.created_at),
            ujianId: ujian.id
          })
        })
      }

      // Tambahkan aktivitas siswa dari ujian_siswa
      if (recentUjianSiswa && recentUjianSiswa.length > 0) {
        recentUjianSiswa.forEach((ujianSiswa: any) => {
          // Aktivitas siswa mulai ujian
          if (ujianSiswa.started_at) {
            activities.push({
              id: `ujian-siswa-started-${ujianSiswa.id}`,
              type: 'siswa_mulai_ujian',
              title: `${ujianSiswa.profiles.full_name} memulai ujian`,
              description: `Ujian: ${ujianSiswa.ujian.name}`,
              time: new Date(ujianSiswa.started_at),
              ujianId: ujianSiswa.ujian.id
            })
          }

          // Aktivitas siswa submit ujian
          if (ujianSiswa.submitted_at && ujianSiswa.status === 'completed') {
            activities.push({
              id: `ujian-siswa-completed-${ujianSiswa.id}`,
              type: 'siswa_selesai_ujian',
              title: `${ujianSiswa.profiles.full_name} menyelesaikan ujian`,
              description: `Ujian: ${ujianSiswa.ujian.name}`,
              time: new Date(ujianSiswa.submitted_at),
              ujianId: ujianSiswa.ujian.id
            })
          }

          // Aktivitas siswa sedang mengerjakan (in_progress)
          if (ujianSiswa.status === 'in_progress' && ujianSiswa.started_at) {
            const timeDiff = Date.now() - new Date(ujianSiswa.started_at).getTime()
            const minutesElapsed = Math.floor(timeDiff / (1000 * 60))
            
            activities.push({
              id: `ujian-siswa-progress-${ujianSiswa.id}`,
              type: 'siswa_mengerjakan',
              title: `${ujianSiswa.profiles.full_name} sedang mengerjakan`,
              description: `${ujianSiswa.ujian.name} • ${minutesElapsed} menit berlalu`,
              time: new Date(ujianSiswa.started_at),
              ujianId: ujianSiswa.ujian.id
            })
          }
        })
      }

      // Tambahkan jawaban terbaru (gunakan backup jika perlu)
      const jawabanData = recentJawaban || backupJawaban
      if (jawabanData && jawabanData.length > 0) {
        jawabanData.forEach((jawaban: any) => {
          activities.push({
            id: `jawaban-${jawaban.id}`,
            type: 'jawaban_masuk',
            title: `${jawaban.profiles.full_name} mengirim jawaban`,
            description: `Ujian: ${jawaban.ujian.name}`,
            time: new Date(jawaban.created_at),
            ujianId: jawaban.ujian.id
          })
        })
      }

      // Sort by time descending dan ambil 8 terbaru untuk dashboard yang lebih informatif
      const sortedActivities = activities
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 8)

      return sortedActivities
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute untuk aktivitas yang lebih real-time
    refetchInterval: false, // REALTIME REMOVED: Auto-refetch disabled to prevent excessive requests
  })
}

