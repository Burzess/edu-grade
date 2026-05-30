import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { VisibilitySetting } from '@/lib/schemas/visibility-schema'

interface VisibilityUpdateResponse {
  id: string
  visibility_setting: VisibilitySetting
  updated_at: string
}

/**
 * Hook to fetch the current visibility setting for an ujian.
 * Query key: ['ujian', ujianId, 'visibility']
 */
export function useVisibilitySetting(ujianId: string): {
  setting: VisibilitySetting | undefined
  isLoading: boolean
  error: Error | null
} {
  const query = useQuery<VisibilityUpdateResponse, Error>({
    queryKey: ['ujian', ujianId, 'visibility'],
    queryFn: async () => {
      const response = await fetch(`/api/ujian/${ujianId}/visibility`)
      if (!response.ok) {
        throw new Error('Gagal memuat pengaturan visibilitas')
      }
      return response.json() as Promise<VisibilityUpdateResponse>
    },
    enabled: !!ujianId,
  })

  return {
    setting: query.data?.visibility_setting,
    isLoading: query.isLoading,
    error: query.error,
  }
}

/**
 * Hook to update the visibility setting for an ujian.
 * Uses optimistic update with rollback on error.
 * Invalidates ['ujian', ujianId] and ['hasil', ujianId] on success.
 */
export function useUpdateVisibility(ujianId: string) {
  const queryClient = useQueryClient()

  return useMutation<VisibilityUpdateResponse, Error, VisibilitySetting>({
    mutationFn: async (newSetting) => {
      const response = await fetch(`/api/ujian/${ujianId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility_setting: newSetting }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          (errorData as { message?: string }).message || 'Gagal menyimpan pengaturan visibilitas'
        )
      }

      return response.json() as Promise<VisibilityUpdateResponse>
    },
    onMutate: async (newSetting: VisibilitySetting) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['ujian', ujianId, 'visibility'] })

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<VisibilityUpdateResponse>(
        ['ujian', ujianId, 'visibility']
      )

      // Optimistically update the cache
      queryClient.setQueryData<VisibilityUpdateResponse>(
        ['ujian', ujianId, 'visibility'],
        (old) => old ? { ...old, visibility_setting: newSetting } : undefined
      )

      return { previousData }
    },
    onError: (
      _error,
      _newSetting,
      _onMutateResult,
      context
    ) => {
      // Rollback to previous state on error
      const ctx = context as unknown as { previousData: VisibilityUpdateResponse | undefined } | undefined
      if (ctx?.previousData) {
        queryClient.setQueryData(
          ['ujian', ujianId, 'visibility'],
          ctx.previousData
        )
      }
    },
    onSuccess: () => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['ujian', ujianId] })
      queryClient.invalidateQueries({ queryKey: ['hasil', ujianId] })
    },
  })
}
