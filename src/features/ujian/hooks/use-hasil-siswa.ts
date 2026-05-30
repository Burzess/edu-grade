import { useQuery } from '@tanstack/react-query'
import type { FilteredHasilSiswa } from '@/lib/visibility-filter'

/**
 * Fetches student exam results for the given ujian.
 * Uses a 30-second refetch interval for real-time polling so that
 * visibility changes made by the teacher are reflected within 30 seconds.
 *
 * @param ujianId - The ID of the ujian to fetch results for
 */
export function useHasilSiswa(ujianId: string) {
  return useQuery<FilteredHasilSiswa>({
    queryKey: ['hasil', ujianId],
    queryFn: async () => {
      const response = await fetch(`/api/ujian/${ujianId}/hasil-siswa`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.message ?? `Gagal mengambil hasil ujian (${response.status})`
        )
      }

      return response.json() as Promise<FilteredHasilSiswa>
    },
    enabled: !!ujianId,
    refetchInterval: 30_000,
  })
}
