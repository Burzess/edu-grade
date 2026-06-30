import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { KelasWithMemberCount, KelasFormData } from '@/types/kelas'

const supabase = createClient()

// Hook untuk mendapatkan daftar kelas guru
export function useKelasGuru() {
    const { user, profile } = useAuthStore()

    return useQuery({
        queryKey: ['kelas', 'guru', user?.id],
        queryFn: async () => {
            if (!user?.id || (profile?.role !== 'guru' && profile?.role !== 'admin')) {
                return []
            }

            const response = await fetch('/api/kelas', {
                credentials: 'include',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || errorData.details || 'Failed to fetch kelas data')
            }

            const result = await response.json()

            if (result.success) {
                return result.data as KelasWithMemberCount[]
            } else {
                throw new Error(result.error || result.details || 'Failed to fetch kelas data')
            }
        },
        enabled: !!user?.id && (profile?.role === 'guru' || profile?.role === 'admin'),
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval: 5 * 60 * 1000,
    })
}

// Hook untuk membuat kelas baru
export function useCreateKelas() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async (kelasData: KelasFormData) => {
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            // Generate kode kelas manual
            const generateKodeKelas = () => {
                const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
                const segments = []
                for (let i = 0; i < 3; i++) {
                    let segment = ''
                    for (let j = 0; j < 3; j++) {
                        segment += chars[Math.floor(Math.random() * chars.length)]
                    }
                    segments.push(segment)
                }
                return segments.join('-')
            }

            const kodeKelas = generateKodeKelas()

            const insertData = {
                nama_kelas: kelasData.nama_kelas.trim(),
                kode_kelas: kodeKelas,
                created_by: user.id,
                guru_id: kelasData.guru_id || null
            }

            const { data, error } = await supabase
                .from('kelas')
                .insert(insertData)
                .select(`
                    *,
                    profiles:created_by (
                        full_name
                    )
                `)
                .single()

            if (error) {
                throw error
            }

            return {
                ...data,
                jumlah_siswa: 0,
                guru_name: data.profiles?.full_name
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })
        },
    })
}

// Hook untuk mendapatkan daftar kelas siswa (hanya kelas aktif)
export function useKelasSiswa() {
    const { user, profile } = useAuthStore()

    return useQuery({
        queryKey: ['kelas', 'siswa', user?.id],
        queryFn: async () => {
            if (!user?.id || profile?.role !== 'siswa') {
                return []
            }

            const response = await fetch('/api/kelas', {
                credentials: 'include',
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || errorData.details || 'Failed to fetch kelas data')
            }

            const result = await response.json()

            if (result.success) {
                return result.data || []
            } else {
                throw new Error(result.error || result.details || 'Failed to fetch kelas data')
            }
        },
        enabled: !!user?.id && profile?.role === 'siswa',
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchInterval: 5 * 60 * 1000,
    })
}

// Hook untuk update nama kelas
export function useUpdateKelasName() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async ({ kelas_id, nama_kelas, guru_id }: { kelas_id: string; nama_kelas: string; guru_id?: string | null }) => {
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            const response = await fetch('/api/kelas', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ kelas_id, nama_kelas, guru_id })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || errorData.message || 'Failed to update kelas name')
            }

            const result = await response.json()
            return result.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })

            queryClient.setQueryData(['kelas', 'guru', user?.id], (oldData: KelasWithMemberCount[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(kelas =>
                    kelas.id === data.id
                        ? { ...kelas, nama_kelas: data.nama_kelas, updated_at: data.updated_at }
                        : kelas
                )
            })
        },
    })
}

// Hook untuk toggle status aktif kelas
export function useToggleKelasStatus() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async ({ kelas_id, is_active }: { kelas_id: string; is_active: boolean }) => {
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            const response = await fetch('/api/kelas', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ kelas_id, is_active })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || errorData.message || 'Failed to update kelas status')
            }

            const result = await response.json()
            return result.data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })

            queryClient.setQueryData(['kelas', 'guru', user?.id], (oldData: KelasWithMemberCount[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(kelas =>
                    kelas.id === data.id
                        ? { ...kelas, is_active: data.is_active, updated_at: data.updated_at }
                        : kelas
                )
            })

            // Invalidate siswa kelas queries karena perubahan status mempengaruhi visibility
            queryClient.invalidateQueries({ queryKey: ['kelas', 'siswa'] })
            queryClient.refetchQueries({ queryKey: ['kelas', 'siswa'] })
        },
    })
}

// Hook untuk join kelas dengan kode
export function useJoinKelas() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async (kodeKelas: string) => {
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            const { data, error } = await supabase
                .rpc('join_kelas_by_code', {
                    p_kode_kelas: kodeKelas,
                    p_siswa_id: user.id
                })

            if (error) {
                throw error
            }

            // Check if the function returned success
            if (data && typeof data === 'object' && 'success' in data) {
                if (data.success === false) {
                    const errorMsg = data.message || 'Join kelas gagal'
                    throw new Error(errorMsg)
                }
            }

            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'siswa', user?.id] })
        },
    })
}

// Hook untuk mendapatkan anggota kelas
export function useKelasMembers(kelasId: string) {
    return useQuery({
        queryKey: ['kelas', 'members', kelasId],
        queryFn: async () => {
            const response = await fetch(`/api/kelas/${kelasId}/members`, {
                credentials: 'include',
            })
            if (!response.ok) throw new Error(`Failed to fetch members: ${response.status}`)
            const result = await response.json()
            if (!result.success) throw new Error('Failed to fetch members')
            return result.data as {
                kelas: { id: string; nama_kelas: string }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                members: any[]
                total_members: number
            }
        },
        enabled: !!kelasId,
    })
}

// Hook untuk menghapus anggota kelas
export function useRemoveKelasMember(kelasId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (siswaId: string) => {
            const response = await fetch(`/api/kelas/${kelasId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ siswa_id: siswaId }),
            })
            if (!response.ok) throw new Error(`Remove failed: ${response.status}`)
            const result = await response.json()
            if (!result.success) throw new Error(result.error || 'Failed to remove member')
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'members', kelasId] })
        },
    })
}

// Hook untuk mendapatkan siswa yang belum ada di kelas ini
export function useAvailableStudents(kelasId: string) {
    return useQuery({
        queryKey: ['kelas', 'available-students', kelasId],
        queryFn: async () => {
            const response = await fetch(`/api/kelas/${kelasId}/available-students`, {
                credentials: 'include',
            })
            if (!response.ok) throw new Error(`Failed to fetch available students: ${response.status}`)
            const result = await response.json()
            if (!result.success) throw new Error('Failed to fetch available students')
            return result.data as { id: string; full_name: string; email: string }[]
        },
        enabled: !!kelasId,
    })
}

// Hook untuk menambahkan anggota kelas
export function useAddKelasMembers(kelasId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (siswaIds: string[]) => {
            const response = await fetch(`/api/kelas/${kelasId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ siswa_ids: siswaIds }),
            })
            if (!response.ok) {
                const result = await response.json().catch(() => ({}))
                throw new Error(result.error || `Add failed: ${response.status}`)
            }
            const result = await response.json()
            if (!result.success) throw new Error(result.error || 'Failed to add members')
            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kelas', 'members', kelasId] })
            queryClient.invalidateQueries({ queryKey: ['kelas', 'available-students', kelasId] })
        },
    })
}
