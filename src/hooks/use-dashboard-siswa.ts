import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

const supabase = createClient()

interface ActivityItem {
  id: string
  type: string
  title: string
  description: string
  time: Date
  ujianId?: string
}

// Hook untuk mendapatkan statistik dashboard siswa
export const useDashboardStatsSiswa = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['dashboard-stats-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      // Query untuk mendapatkan statistik ujian siswa
      const { data: ujianSiswaStats, error: ujianSiswaError } = await supabase
        .from('ujian_siswa')
        .select(`
          id,
          status,
          started_at,
          submitted_at,
          ujian!inner(
            id,
            name,
            duration_minutes
          )
        `)
        .eq('siswa_id', user.id)

      if (ujianSiswaError) throw ujianSiswaError

      // Query untuk mendapatkan nilai-nilai siswa
      const { data: nilaiStats, error: nilaiError } = await supabase
        .from('jawaban_siswa')
        .select('score, ujian_id')
        .eq('siswa_id', user.id)
        .not('score', 'is', null)

      if (nilaiError) throw nilaiError

      // Hitung statistik
      const totalUjianDiikuti = ujianSiswaStats?.length || 0
      const ujianSelesai = ujianSiswaStats?.filter((us: any) => us.status === 'completed').length || 0
      const ujianDalamProses = ujianSiswaStats?.filter((us: any) => us.status === 'in_progress').length || 0
      
      // Average score calculation per ujian
      const ujianScores = new Map()
      nilaiStats?.forEach((jawaban: any) => {
        if (!ujianScores.has(jawaban.ujian_id)) {
          ujianScores.set(jawaban.ujian_id, [])
        }
        ujianScores.get(jawaban.ujian_id).push(jawaban.score)
      })

      // Calculate average per ujian, then overall average
      const ujianAverages: number[] = []
      for (const [, scores] of ujianScores) {
        const ujianAvg = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
        ujianAverages.push(ujianAvg)
      }

      const overallAverage = ujianAverages.length > 0 
        ? Math.round(ujianAverages.reduce((sum, avg) => sum + avg, 0) / ujianAverages.length)
        : null

      // Calculate total study time (based on ujian duration for completed exams)
      const totalStudyTime = ujianSiswaStats
        ?.filter((us: any) => us.status === 'completed')
        .reduce((total: number, us: any) => {
          if (us.started_at && us.submitted_at) {
            const actualTime = new Date(us.submitted_at).getTime() - new Date(us.started_at).getTime()
            const actualMinutes = Math.floor(actualTime / (1000 * 60))
            return total + actualMinutes
          }
          return total + (us.ujian.duration_minutes || 0)
        }, 0) || 0

      return {
        totalUjianDiikuti,
        ujianSelesai,
        ujianDalamProses,
        rataRataNilai: overallAverage,
        totalWaktuBelajar: totalStudyTime,
        ujianSiswaData: ujianSiswaStats
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook untuk mendapatkan aktivitas terbaru siswa
export const useRecentActivitySiswa = () => {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['recent-activity-siswa', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      // Query untuk aktivitas ujian siswa terbaru
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
            duration_minutes,
            created_by,
            profiles!created_by(full_name)
          )
        `)
        .eq('siswa_id', user.id)
        .order('started_at', { ascending: false, nullsFirst: false })
        .limit(8)

      if (ujianSiswaError) throw ujianSiswaError

      // Query untuk jawaban terbaru yang dikirim
      const { data: recentJawaban, error: jawabanError } = await supabase
        .from('jawaban_siswa')
        .select(`
          id,
          created_at,
          score,
          ujian!inner(
            id,
            name,
            created_by,
            profiles!created_by(full_name)
          )
        `)
        .eq('siswa_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (jawabanError) throw jawabanError

      // Format aktivitas
      const activities: ActivityItem[] = []

      // Tambahkan aktivitas ujian siswa
      if (recentUjianSiswa) {
        recentUjianSiswa.forEach((ujianSiswa: any) => {
          // Aktivitas mulai ujian
          if (ujianSiswa.started_at) {
            activities.push({
              id: `started-${ujianSiswa.id}`,
              type: 'mulai_ujian',
              title: `Memulai ujian: ${ujianSiswa.ujian.name}`,
              description: `Guru: ${ujianSiswa.ujian.profiles?.full_name || 'Tidak diketahui'}`,
              time: new Date(ujianSiswa.started_at),
              ujianId: ujianSiswa.ujian.id
            })
          }

          // Aktivitas submit ujian
          if (ujianSiswa.submitted_at && ujianSiswa.status === 'completed') {
            const duration = ujianSiswa.started_at 
              ? Math.floor((new Date(ujianSiswa.submitted_at).getTime() - new Date(ujianSiswa.started_at).getTime()) / (1000 * 60))
              : ujianSiswa.ujian.duration_minutes

            activities.push({
              id: `completed-${ujianSiswa.id}`,
              type: 'selesai_ujian',
              title: `Menyelesaikan ujian: ${ujianSiswa.ujian.name}`,
              description: `Durasi: ${duration} menit`,
              time: new Date(ujianSiswa.submitted_at),
              ujianId: ujianSiswa.ujian.id
            })
          }

          // Aktivitas ujian yang sedang berlangsung (prioritas tinggi)
          if (ujianSiswa.status === 'in_progress' && ujianSiswa.started_at) {
            const timeDiff = Date.now() - new Date(ujianSiswa.started_at).getTime()
            const minutesElapsed = Math.floor(timeDiff / (1000 * 60))
            
            activities.push({
              id: `in-progress-${ujianSiswa.id}`,
              type: 'ujian_berlangsung',
              title: `Sedang mengerjakan: ${ujianSiswa.ujian.name}`,
              description: `${minutesElapsed} menit berlalu • ${ujianSiswa.ujian.duration_minutes - minutesElapsed} menit tersisa`,
              time: new Date(ujianSiswa.started_at),
              ujianId: ujianSiswa.ujian.id
            })
          }
        })
      }

      // Tambahkan aktivitas jawaban (untuk konteks tambahan)
      if (recentJawaban) {
        recentJawaban.forEach((jawaban: any) => {
          activities.push({
            id: `jawaban-${jawaban.id}`,
            type: 'kirim_jawaban',
            title: `Mengirim jawaban: ${jawaban.ujian.name}`,
            description: jawaban.score !== null ? `Nilai: ${jawaban.score}` : 'Belum dinilai',
            time: new Date(jawaban.created_at),
            ujianId: jawaban.ujian.id
          })
        })
      }

      // Sort by time descending dan ambil 6 terbaru
      return activities
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 6)
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Hook untuk mendapatkan ujian yang tersedia untuk siswa
export const useAvailableUjianForSiswaDashboard = () => {
  const { user } = useAuthStore()

  const query = useQuery({
    queryKey: ['available-ujian-dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')

      // Get ujian yang statusnya active dan belum diikuti siswa ini
      const { data, error } = await supabase
        .from('ujian')
        .select(`
          id,
          name,
          description,
          duration_minutes,
          start_time,
          end_time,
          status,
          created_at,
          profiles!created_by(full_name),
          ujian_soal(count)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      // Filter ujian yang belum expired dan belum diikuti
      const now = new Date()

      // Fetch semua ujian_siswa milik user sekaligus (hindari N+1 query)
      const { data: studentUjians } = await supabase
        .from('ujian_siswa')
        .select('ujian_id')
        .eq('siswa_id', user.id)

      const takenUjianIds = new Set(studentUjians?.map(su => su.ujian_id) || [])

      const availableUjian = (data || [])
        .filter(ujian => {
          if (ujian.end_time && new Date(ujian.end_time) <= now) return false
          return !takenUjianIds.has(ujian.id)
        })
        .map(ujian => ({
          ...ujian,
          totalSoal: (ujian.ujian_soal as { count: number }[])?.[0]?.count || 0
        }))

      return availableUjian
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  return query
}
