import React from 'react'
import {
  useAvailableUjianForSiswa,
  useUjianSiswa,
  useStartUjianSiswa,
  useSubmitUjianSiswa,
  useActiveUjianSiswa,
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
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Ujian Tersedia</h2>
      {availableUjian && availableUjian.length > 0 ? (
        <div className="grid gap-4">
          {availableUjian.map(ujian => (
            <div key={ujian.id} className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold mb-2">{ujian.name}</h3>
              {ujian.description && (
                <p className="text-gray-600 mb-3">{ujian.description}</p>
              )}
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <p>Durasi: {ujian.duration_minutes} menit</p>
                  <p>Jumlah Soal: {ujian.ujian_soal?.[0]?.count || 0}</p>
                  {ujian.end_time && (
                    <p>Berakhir: {new Date(ujian.end_time).toLocaleString('id-ID')}</p>
                  )}
                </div>
                <button
                  onClick={() => handleStartUjian(ujian.id)}
                  disabled={startUjianMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {startUjianMutation.isPending ? 'Memulai...' : 'Mulai Ujian'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
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
                <p className="text-gray-600 mb-3">{us.ujian.description}</p>
              )}

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p>Status:
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${us.status === 'completed' ? 'bg-green-100 text-green-800' :
                      us.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
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
                    onClick={() => window.location.href = `/ujian/${us.ujian_id}/kerjakan`}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  >
                    Lanjutkan Ujian
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Anda belum mengikuti ujian apapun
        </div>
      )}
    </div>
  )
}

// Component untuk workspace ujian siswa
export function UjianWorkspace({ ujianId }: { ujianId: string }) {
  const { data, isLoading, error } = useActiveUjianSiswa(ujianId)
  const submitUjianMutation = useSubmitUjianSiswa()

  const handleSubmit = async () => {
    if (confirm('Apakah Anda yakin ingin submit ujian ini? Setelah disubmit tidak bisa diubah lagi.')) {
      try {
        await submitUjianMutation.mutateAsync(ujianId)
        alert('Ujian berhasil disubmit!')
        window.location.href = '/ujian/saya'
      } catch (error: any) {
        alert(`Error: ${error.message}`)
      }
    }
  }

  // Format waktu dalam detik ke HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (isLoading) return <div className="p-4">Loading ujian...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error.message}</div>
  if (!data) return <div className="p-4">Ujian tidak ditemukan</div>

  const { ujian, ujianSiswa, existingAnswers, remainingTime } = data

  // Auto-submit jika waktu habis
  React.useEffect(() => {
    if (remainingTime === 0 && ujianSiswa.status === 'in_progress') {
      submitUjianMutation.mutate(ujianId)
    }
  }, [remainingTime, ujianSiswa.status])

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{ujian.name}</h1>
        {ujian.description && (
          <p className="text-gray-600 mb-4">{ujian.description}</p>
        )}

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <p>Status:
              <span className={`ml-2 px-2 py-1 rounded text-xs ${ujianSiswa.status === 'completed' ? 'bg-green-100 text-green-800' :
                ujianSiswa.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                {ujianSiswa.status === 'completed' ? 'Selesai' :
                  ujianSiswa.status === 'in_progress' ? 'Sedang Dikerjakan' :
                    'Belum Dimulai'}
              </span>
            </p>
            <p>Jumlah Soal: {ujian.ujian_soal?.length || 0}</p>
          </div>

          {remainingTime !== null && ujianSiswa.status === 'in_progress' && (
            <div className={`text-right ${remainingTime <= 300 ? 'text-red-600' : 'text-blue-600'}`}>
              <p className="text-sm">Waktu Tersisa:</p>
              <p className="text-2xl font-bold">{formatTime(remainingTime)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Soal-soal */}
      {ujianSiswa.status === 'in_progress' && (
        <div className="space-y-6">
          {ujian.ujian_soal?.sort((a: any, b: any) => a.urutan - b.urutan).map((us: any, index: number) => {
            const existingAnswer = existingAnswers.find(ans => ans.soal_id === us.soal_id)

            return (
              <div key={us.id} className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Soal {index + 1}
                </h3>
                <p className="text-gray-800 mb-4 whitespace-pre-wrap">
                  {us.soal.question_text}
                </p>

                {/* Form jawaban berdasarkan tipe soal */}
                {us.soal.question_type === 'multiple_choice' && us.soal.options ? (
                  <div className="space-y-2">
                    {us.soal.options.map((option: any) => (
                      <label key={option.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`soal_${us.soal_id}`}
                          value={option.id}
                          defaultChecked={existingAnswer?.answer_text === option.id}
                          className="mt-1"
                        />
                        <span className="text-gray-700">{option.text}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    placeholder="Tulis jawaban Anda di sini..."
                    defaultValue={existingAnswer?.answer_text || ''}
                    className="w-full p-3 border rounded-md min-h-[120px] resize-vertical"
                  />
                )}

                <div className="mt-4 pt-4 border-t">
                  <div className="flex flex-wrap gap-1">
                    {us.soal.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    <span className={`px-2 py-1 text-xs rounded ${us.soal.difficulty_level === 'easy' ? 'bg-green-100 text-green-800' :
                      us.soal.difficulty_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {us.soal.difficulty_level === 'easy' ? 'Mudah' :
                        us.soal.difficulty_level === 'medium' ? 'Sedang' : 'Sulit'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Submit Button */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <button
                onClick={handleSubmit}
                disabled={submitUjianMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md text-lg font-semibold disabled:opacity-50"
              >
                {submitUjianMutation.isPending ? 'Submitting...' : 'Submit Ujian'}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Pastikan semua jawaban sudah terisi sebelum submit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Jika ujian sudah selesai */}
      {ujianSiswa.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            Ujian Telah Selesai
          </h3>
          <p className="text-green-700">
            Anda telah menyelesaikan ujian ini pada {ujianSiswa.submitted_at ? new Date(ujianSiswa.submitted_at).toLocaleString('id-ID') : '-'}
          </p>
        </div>
      )}
    </div>
  )
}

// Component utama untuk siswa dengan auto status checker
export function StudentUjianApp() {
  const { user } = useAuthStore()

  // Auto-check expired ujian untuk siswa
  useUjianSiswaStatusChecker()

  if (!user || user.role !== 'siswa') {
    return <div className="p-4 text-red-600">Akses ditolak. Hanya untuk siswa.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Portal Ujian Siswa</h1>

        {/* Tab navigation atau routing bisa ditambahkan di sini */}
        <div className="space-y-8">
          <AvailableUjianList />
          <MyUjianList />
        </div>
      </div>
    </div>
  )
}
