import { useQuery } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/store/auth'

// Inisialisasi Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface ActivityItem {
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

      console.log('Fetching dashboard stats for user:', user.id)

      // Query untuk mendapatkan statistik ujian
      const { data: ujianStats, error: ujianError } = await supabase
        .from('ujian')
        .select('id, status, created_at')
        .eq('created_by', user.id)

      if (ujianError) {
        console.error('Error fetching ujian stats:', ujianError)
        throw ujianError
      }

      console.log('Ujian stats:', ujianStats)

      // Query untuk mendapatkan total siswa yang pernah mengikuti ujian guru ini dari ujian_siswa
      const { data: ujianSiswaStats, error: ujianSiswaError } = await supabase
        .from('ujian_siswa')
        .select(`
          siswa_id,
          status,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)

      if (ujianSiswaError) {
        console.error('Error fetching ujian siswa stats:', ujianSiswaError)
        // Jangan throw error jika tabel ujian_siswa belum ada data
        console.log('ujian_siswa table might be empty or not exist, continuing...')
      }

      console.log('Ujian siswa stats:', ujianSiswaStats)

      // Query untuk mendapatkan rata-rata nilai dari jawaban_siswa
      const { data: nilaiStats, error: nilaiError } = await supabase
        .from('jawaban_siswa')
        .select(`
          score,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)
        .not('score', 'is', null)

      if (nilaiError) {
        console.error('Error fetching nilai stats:', nilaiError)
        // Jangan throw error jika tabel jawaban_siswa belum ada data
        console.log('jawaban_siswa table might be empty or not exist, continuing...')
      }

      console.log('Nilai stats:', nilaiStats)

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
        console.log('Using backup from jawaban table:', backupNilaiStats)
      }

      // Hitung statistik
      const totalUjian = ujianStats?.length || 0
      const activeUjian = ujianStats?.filter((u: any) => u.status === 'active').length || 0
      const completedUjian = ujianStats?.filter((u: any) => u.status === 'completed').length || 0
      
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

      const result = {
        totalUjian,
        activeUjian,
        completedUjian,
        totalSiswa: uniqueSiswa,
        siswaAktif,
        averageScore,
        ujianData: ujianStats,
        ujianSiswaData: ujianSiswaStats
      }

      console.log('Final dashboard stats:', result)
      return result
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

      console.log('Fetching recent activity for user:', user.id)

      // Query untuk ujian terbaru yang dibuat
      const { data: recentUjian, error: ujianError } = await supabase
        .from('ujian')
        .select('id, name, created_at, status')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      if (ujianError) {
        console.error('Error fetching recent ujian:', ujianError)
        throw ujianError
      }

      console.log('Recent ujian:', recentUjian)

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

      if (ujianSiswaError) {
        console.error('Error fetching ujian siswa activity:', ujianSiswaError)
        // Jangan throw error, lanjutkan dengan data kosong
        console.log('ujian_siswa table might be empty, continuing...')
      }

      console.log('Recent ujian siswa:', recentUjianSiswa)

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

      if (jawabanError) {
        console.error('Error fetching recent jawaban:', jawabanError)
        // Coba gunakan tabel jawaban sebagai fallback
        console.log('Trying fallback to jawaban table...')
      }

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
          console.log('Using backup jawaban data:', backupJawaban)
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

      console.log('Final activities:', sortedActivities)
      return sortedActivities
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute untuk aktivitas yang lebih real-time
    refetchInterval: false, // REALTIME REMOVED: Auto-refetch disabled to prevent excessive requests
  })
}

