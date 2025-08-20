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

      if (ujianSiswaError) throw ujianSiswaError

      // Query untuk mendapatkan rata-rata nilai
      const { data: nilaiStats, error: nilaiError } = await supabase
        .from('jawaban_siswa')
        .select(`
          score,
          ujian!inner(created_by)
        `)
        .eq('ujian.created_by', user.id)
        .not('score', 'is', null)

      if (nilaiError) throw nilaiError

      // Hitung statistik
      const totalUjian = ujianStats?.length || 0
      const activeUjian = ujianStats?.filter((u: any) => u.status === 'active').length || 0
      const completedUjian = ujianStats?.filter((u: any) => u.status === 'completed').length || 0
      
      // Unique siswa count dari ujian_siswa
      const uniqueSiswa = new Set(ujianSiswaStats?.map((us: any) => us.siswa_id)).size
      
      // Siswa yang sedang mengerjakan ujian
      const siswaAktif = ujianSiswaStats?.filter((us: any) => us.status === 'in_progress').length || 0
      
      // Average score calculation
      const validScores = nilaiStats?.filter((n: any) => n.score !== null).map((n: any) => n.score) || []
      const averageScore = validScores.length > 0 
        ? Math.round(validScores.reduce((sum: number, score: number) => sum + score, 0) / validScores.length)
        : null

      return {
        totalUjian,
        activeUjian,
        completedUjian,
        totalSiswa: uniqueSiswa,
        siswaAktif,
        averageScore,
        ujianData: ujianStats,
        ujianSiswaData: ujianSiswaStats
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

      if (ujianSiswaError) throw ujianSiswaError

      // Query untuk jawaban terbaru yang masuk (fallback jika diperlukan)
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
        .limit(3)

      if (jawabanError) throw jawabanError

      // Format aktivitas
      const activities: ActivityItem[] = []

      // Tambahkan ujian terbaru
      if (recentUjian) {
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
      if (recentUjianSiswa) {
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

      // Tambahkan jawaban terbaru (sebagai informasi tambahan)
      if (recentJawaban) {
        recentJawaban.forEach((jawaban: any) => {
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
      return activities
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 8)
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute untuk aktivitas yang lebih real-time
    refetchInterval: 30000, // Auto-refetch setiap 30 detik
  })
}

