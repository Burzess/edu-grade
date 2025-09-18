import React from 'react'
import {
  useAvailableUjianForSiswa,
  useUjianSiswa,
  useStartUjianSiswa,
  useSubmitUjianSiswa,
  useUjianSiswaStatusChecker
} from '@/hooks/use-ujian'
import { useAuthStore } from '@/store/auth'

// Component untuk menampilkan daftar ujian yang tersedia untuk siswa
export function AvailableUjianList() {
  const { data: availableUjian, isLoading, error } = useAvailableUjianForSiswa()
  const startUjianMutation = useStartUjianSiswa()

  const handleStartUjian = async (ujianId: string) => {
    try {
      await startUjianMutation.mutateAsync(ujianId)
      alert('Ujian berhasil dimulai!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  if (isLoading) return <div className="p-4">Loading ujian tersedia...</div>
  if (error) return <div className="p-4 text-red-600 dark:text-red-400">Error: {error.message}</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Ujian Tersedia</h2>
      {availableUjian && availableUjian.length > 0 ? (
        <div className="grid gap-4">
          {availableUjian.map(ujian => (
            <div key={ujian.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{ujian.name}</h3>
              {ujian.description && (
                <p className="text-muted-foreground mb-3">{ujian.description}</p>
              )}
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <p>Durasi: {ujian.duration_minutes} menit</p>
                  <p>Jumlah Soal: {ujian.ujian_soal?.[0]?.count || 0}</p>
                  {ujian.end_time && (
                    <p>Berakhir: {new Date(ujian.end_time).toLocaleString('id-ID')}</p>
                  )}
                </div>
                <button
                  onClick={() => handleStartUjian(ujian.id)}
                  disabled={startUjianMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {startUjianMutation.isPending ? 'Memulai...' : 'Mulai Ujian'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Tidak ada ujian tersedia saat ini
        </div>
      )}
    </div>
  )
}

// Component untuk menampilkan ujian yang sedang atau sudah dikerjakan siswa
export function MyUjianList() {
  const { data: ujianSiswa, isLoading } = useUjianSiswa()

  if (isLoading) return <div className="p-4">Loading ujian Anda...</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Ujian Saya</h2>
      {ujianSiswa && ujianSiswa.length > 0 ? (
        <div className="grid gap-4">
          {ujianSiswa.map(us => (
            <div key={us.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{us.ujian.name}</h3>
              {us.ujian.description && (
                <p className="text-muted-foreground mb-3">{us.ujian.description}</p>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  <p>Status:
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${us.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      us.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                      {us.status === 'completed' ? 'Selesai' :
                        us.status === 'in_progress' ? 'Sedang Dikerjakan' :
                          'Belum Dimulai'}
                    </span>
                  </p>
                  <p>Durasi: {us.ujian.duration_minutes} menit</p>
                  {us.started_at && (
                    <p>Dimulai: {new Date(us.started_at).toLocaleString('id-ID')}</p>
                  )}
                  {us.submitted_at && (
                    <p>Diselesaikan: {new Date(us.submitted_at).toLocaleString('id-ID')}</p>
                  )}
                </div>

                {us.status === 'in_progress' && (
                  <button
                    onClick={() => window.location.href = `/siswa/ujian/${us.ujian_id}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md dark:bg-green-700 dark:hover:bg-green-800"
                  >
                    Lanjutkan
                  </button>
                )}

                {us.status === 'completed' && (
                  <button
                    onClick={() => window.location.href = `/siswa/hasil/${us.ujian_id}`}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md"
                  >
                    Lihat Hasil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Anda belum mengikuti ujian apapun
        </div>
      )}
    </div>
  )
}

// Component untuk workspace ujian siswa - DEPRECATED 
export function UjianWorkspace({ ujianId }: { ujianId: string }) {
  // EMERGENCY: Hook ini di-disable, redirect user ke halaman yang benar
  React.useEffect(() => {
    console.warn('⚠️ UjianWorkspace is deprecated, redirecting to proper ujian page')
    window.location.href = `/siswa/ujian/${ujianId}`
  }, [ujianId])

  return (
    <div className="p-6 text-center">
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-lg p-6 mb-4">
        <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">
          Komponen Sedang Diperbaiki
        </h3>
        <p className="text-orange-700 dark:text-orange-400 mb-4">
          Komponen UjianWorkspace sedang di-disable untuk mencegah infinite requests. 
          Anda akan dialihkan ke halaman ujian yang sudah diperbaiki.
        </p>
        <p className="text-sm text-orange-600 dark:text-orange-400">
          Jika tidak teralihkan otomatis, <a href={`/siswa/ujian/${ujianId}`} className="underline font-medium">klik di sini</a>
        </p>
      </div>
    </div>
  )
}

// Status Checker Component - DEPRECATED
export function UjianSiswaStatusChecker() {
  // DISABLED: Status checker dihapus untuk mencegah infinite requests
  useUjianSiswaStatusChecker() // Keep the hook call to prevent other issues
  return null
}
