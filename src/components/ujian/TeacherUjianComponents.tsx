import React from 'react'
import { useUjianStatistics, useUjianStatusChecker } from '@/hooks/use-ujian'
import { useAuthStore } from '@/store/auth'

// Component untuk menampilkan statistik ujian untuk guru
export function UjianStatisticsComponent({ ujianId }: { ujianId: string }) {
  const { data, isLoading, error } = useUjianStatistics(ujianId)

  if (isLoading) return <div className="p-4">Loading statistik ujian...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>
  if (!data) return <div className="p-4">Data tidak ditemukan</div>

  const { ujian, statistics } = data

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-card shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{ujian.name}</h1>
        {ujian.description && (
          <p className="text-muted-foreground mb-4">{ujian.description}</p>
        )}
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
          <div>
            <p>Durasi: {ujian.duration_minutes} menit</p>
          </div>
          <div>
            <p>Status: 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                ujian.status === 'completed' ? 'bg-muted text-muted-foreground' :
                ujian.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
              }`}>
                {ujian.status === 'completed' ? 'Selesai' :
                 ujian.status === 'active' ? 'Aktif' : 'Draft'}
              </span>
            </p>
          </div>
          <div>
            <p>Dibuat: {new Date(ujian.created_at).toLocaleDateString('id-ID')}</p>
          </div>
          {ujian.start_time && (
            <div>
              <p>Dimulai: {new Date(ujian.start_time).toLocaleString('id-ID')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Siswa</p>
              <p className="text-3xl font-bold text-foreground">{statistics.totalSiswa}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-full">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sedang Mengerjakan</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{statistics.siswaInProgress}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sudah Selesai</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{statistics.siswaCompleted}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-card shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tingkat Penyelesaian</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{statistics.completionRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {statistics.totalSiswa > 0 && (
        <div className="bg-card shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Progress Ujian</h3>
          <div className="relative">
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-muted">
              <div
                style={{
                  width: `${(statistics.siswaCompleted / statistics.totalSiswa) * 100}%`
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500 dark:bg-green-600"
              ></div>
              <div
                style={{
                  width: `${(statistics.siswaInProgress / statistics.totalSiswa) * 100}%`
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-yellow-500 dark:bg-yellow-600"
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>{statistics.completionRate}% selesai</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Daftar Siswa */}
      <div className="bg-card shadow rounded-lg">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold">Daftar Siswa ({statistics.totalSiswa})</h3>
        </div>
        
        {statistics.totalSiswa > 0 ? (
          <div className="divide-y divide-border">
            {ujian.ujian_siswa?.map((us: any) => (
              <div key={us.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-muted-foreground">
                            {us.profiles?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {us.profiles?.full_name || 'Nama tidak tersedia'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {us.profiles?.email || 'Email tidak tersedia'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Waktu informasi */}
                    <div className="text-right text-xs text-muted-foreground">
                      {us.started_at && (
                        <p>Mulai: {new Date(us.started_at).toLocaleString('id-ID')}</p>
                      )}
                      {us.submitted_at && (
                        <p>Selesai: {new Date(us.submitted_at).toLocaleString('id-ID')}</p>
                      )}
                    </div>
                    
                    {/* Status badge */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      us.status === 'completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                      us.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {us.status === 'completed' ? 'Selesai' :
                       us.status === 'in_progress' ? 'Mengerjakan' :
                       'Belum Mulai'}
                    </span>
                    
                    {/* Duration if completed */}
                    {us.status === 'completed' && us.started_at && us.submitted_at && (
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const duration = new Date(us.submitted_at).getTime() - new Date(us.started_at).getTime()
                          const minutes = Math.floor(duration / (1000 * 60))
                          const seconds = Math.floor((duration % (1000 * 60)) / 1000)
                          return `${minutes}m ${seconds}s`
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-muted-foreground">
            Belum ada siswa yang mengikuti ujian ini
          </div>
        )}
      </div>

      {/* Action buttons (bisa ditambahkan jika perlu) */}
      <div className="mt-6 flex justify-end space-x-3">
        <button className="px-4 py-2 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent">
          Export Data
        </button>
        <button className="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Refresh Data
        </button>
      </div>
    </div>
  )
}

// Component untuk guru dengan auto status checker
export function TeacherUjianApp({ ujianId }: { ujianId: string }) {
  const { user } = useAuthStore()
  
  // Auto-check expired ujian untuk guru
  useUjianStatusChecker()

  if (!user || user.role !== 'guru') {
    return <div className="p-4 text-red-600">Akses ditolak. Hanya untuk guru.</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <button 
            onClick={() => window.history.back()}
            className="text-primary hover:text-primary/80 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Kembali ke Daftar Ujian</span>
          </button>
        </div>
        
        <UjianStatisticsComponent ujianId={ujianId} />
      </div>
    </div>
  )
}

// Component untuk monitoring ujian (REALTIME REMOVED)
export function UjianMonitor({ ujianId }: { ujianId: string }) {
  const { data, isLoading } = useUjianStatistics(ujianId)

  // REALTIME REMOVED: Auto-refresh dihapus untuk mencegah excessive requests

  if (isLoading) return <div className="p-4">Loading monitor...</div>
  if (!data) return <div className="p-4">Data tidak tersedia</div>

  const { statistics } = data

  return (
    <div className="fixed bottom-4 right-4 bg-card shadow-lg rounded-lg p-4 border-l-4 border-primary max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">Monitor Ujian</h4>
        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
          Static
        </span>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{statistics.totalSiswa}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Mengerjakan:</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">{statistics.siswaInProgress}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Selesai:</span>
          <span className="font-medium text-green-600 dark:text-green-400">{statistics.siswaCompleted}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Progress:</span>
          <span className="font-medium text-primary">{statistics.completionRate}%</span>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        Data saat halaman dimuat
      </div>
    </div>
  )
}
