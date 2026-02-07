import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getAccessToken } from '@/lib/supabase/auth-helpers'
import { useAuthStore } from '@/store/auth'
import { KelasWithMemberCount, KelasFormData } from '@/types/kelas'

const supabase = createClient()

/**
 * Helper untuk mendapatkan access token dengan validasi
 * Menggunakan getUser() untuk memastikan token masih valid
 */
async function getValidAccessToken(): Promise<string> {
    // Pertama validasi user masih authenticated
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        throw new Error('Session tidak valid atau expired')
    }
    
    // Kemudian ambil token dari session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
        throw new Error('Access token tidak tersedia')
    }
    
    return session.access_token
}

// Hook untuk mendapatkan daftar kelas guru
export function useKelasGuru() {
    const { user, profile } = useAuthStore()

    return useQuery({
        queryKey: ['kelas', 'guru', user?.id],
        queryFn: async () => {
            if (!user?.id || profile?.role !== 'guru') {
                return []
            }

            try {
                // Validasi dan ambil token dengan cara yang aman
                const accessToken = await getValidAccessToken()

                // Gunakan API endpoint untuk konsistensi
                const response = await fetch('/api/kelas', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                })

                console.log('🌐 API Response status:', response.status, response.statusText);

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error('❌ API response error:', errorData)
                    console.error('❌ Full error details:', JSON.stringify(errorData, null, 2))
                    throw new Error(errorData.error || errorData.details || 'Failed to fetch kelas data')
                }

                const result = await response.json()
                console.log('📊 API Response data:', {
                    success: result.success,
                    dataCount: result.data?.length,
                    role: result.role
                });

                if (result.success) {
                    return result.data as KelasWithMemberCount[]
                } else {
                    console.error('❌ API returned unsuccessful response:', result)
                    throw new Error(result.error || result.details || 'Failed to fetch kelas data')
                }
            } catch (error) {
                console.error('useKelasGuru error:', error)
                throw error
            }
        },
        enabled: !!user?.id && profile?.role === 'guru',
        staleTime: 2 * 60 * 1000, // Reduced to 2 minutes untuk lebih responsif
        refetchOnWindowFocus: true, // Enable refetch on focus untuk sinkronisasi
        refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
    })
}

// Hook untuk membuat kelas baru
export function useCreateKelas() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async (kelasData: KelasFormData) => {
            console.log('🔄 Hook: Starting create kelas mutation');
            console.log('🔄 Hook: User state:', { userId: user?.id, user });
            console.log('🔄 Hook: Kelas data:', kelasData);
            
            if (!user?.id) {
                console.error('❌ Hook: User not authenticated');
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
            console.log('🔄 Hook: Generated kode kelas:', kodeKelas);

            const insertData = {
                nama_kelas: kelasData.nama_kelas.trim(),
                kode_kelas: kodeKelas,
                created_by: user.id
            };
            
            console.log('🔄 Hook: Insert data:', insertData);

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

            console.log('🔄 Hook: Supabase response:', { data, error });

            if (error) {
                console.error('❌ Hook: Supabase error:', error)
                console.error('❌ Hook: Full error object:', JSON.stringify(error, null, 2))
                throw error
            }

            const result = {
                ...data,
                jumlah_siswa: 0,
                guru_name: data.profiles?.full_name
            };
            
            console.log('✅ Hook: Final result:', result);
            return result;
        },
        onSuccess: () => {
            console.log('✅ Hook: Mutation successful, invalidating queries');
            // Invalidate kelas list untuk refresh data
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })
        },
        onError: (error) => {
            console.error('❌ Hook: Mutation failed:', error);
        }
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

            try {
                // Validasi dan ambil token dengan cara yang aman
                const accessToken = await getValidAccessToken()

                console.log('🎓 Fetching kelas for siswa:', user.id);

                // Gunakan API endpoint yang sudah memfilter kelas aktif
                const response = await fetch('/api/kelas', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                })

                console.log('🌐 Siswa API Response status:', response.status, response.statusText);

                if (!response.ok) {
                    const errorData = await response.json()
                    console.error('❌ Siswa API response error:', errorData)
                    throw new Error(errorData.error || errorData.details || 'Failed to fetch kelas data')
                }

                const result = await response.json()
                console.log('📊 Siswa API Response data:', {
                    success: result.success,
                    dataCount: result.data?.length,
                    role: result.role,
                    data: result.data // Debug: lihat data lengkap
                });

                if (result.success) {
                    // API sudah memfilter hanya kelas aktif untuk siswa
                    return result.data || []
                } else {
                    console.error('❌ Siswa API returned unsuccessful response:', result)
                    throw new Error(result.error || result.details || 'Failed to fetch kelas data')
                }
            } catch (error) {
                console.error('useKelasSiswa error:', error)
                throw error
            }
        },
        enabled: !!user?.id && profile?.role === 'siswa',
        staleTime: 2 * 60 * 1000, // Reduced to 2 minutes untuk lebih responsif
        refetchOnWindowFocus: true, // Enable refetch on focus untuk sinkronisasi
        refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
    })
}

// Hook untuk update nama kelas
export function useUpdateKelasName() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async ({ kelas_id, nama_kelas }: { kelas_id: string; nama_kelas: string }) => {
            console.log('🔄 Hook: Starting update kelas name mutation:', { kelas_id, nama_kelas });
            
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            // Validasi dan ambil token dengan cara yang aman
            const accessToken = await getValidAccessToken()

            // Call API endpoint untuk update
            const response = await fetch('/api/kelas', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ kelas_id, nama_kelas })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('❌ API response error:', errorData)
                throw new Error(errorData.error || errorData.message || 'Failed to update kelas name')
            }

            const result = await response.json()
            console.log('✅ Kelas name updated via hook:', result)
            return result.data
        },
        onSuccess: (data) => {
            console.log('✅ Hook: Update name successful, invalidating queries');
            // Invalidate specific kelas query untuk refresh data
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })
            
            // Optionally update specific item in cache untuk instant update
            queryClient.setQueryData(['kelas', 'guru', user?.id], (oldData: KelasWithMemberCount[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(kelas => 
                    kelas.id === data.id 
                        ? { ...kelas, nama_kelas: data.nama_kelas, updated_at: data.updated_at }
                        : kelas
                )
            })
        },
        onError: (error) => {
            console.error('❌ Hook: Update name failed:', error);
        }
    })
}

// Hook untuk toggle status aktif kelas
export function useToggleKelasStatus() {
    const queryClient = useQueryClient()
    const { user } = useAuthStore()

    return useMutation({
        mutationFn: async ({ kelas_id, is_active }: { kelas_id: string; is_active: boolean }) => {
            console.log('🔄 Hook: Starting toggle kelas status mutation:', { kelas_id, is_active });
            
            if (!user?.id) {
                throw new Error('User tidak terautentikasi')
            }

            // Validasi dan ambil token dengan cara yang aman
            const accessToken = await getValidAccessToken()

            // Call API endpoint untuk update status
            const response = await fetch('/api/kelas', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ kelas_id, is_active })
            })

            if (!response.ok) {
                const errorData = await response.json()
                console.error('❌ API response error:', errorData)
                throw new Error(errorData.error || errorData.message || 'Failed to update kelas status')
            }

            const result = await response.json()
            console.log('✅ Kelas status updated via hook:', result)
            return result.data
        },
        onSuccess: (data) => {
            console.log('✅ Hook: Toggle status successful, invalidating queries');
            // Invalidate specific kelas query untuk refresh data
            queryClient.invalidateQueries({ queryKey: ['kelas', 'guru', user?.id] })
            
            // Update specific item in cache untuk instant update
            queryClient.setQueryData(['kelas', 'guru', user?.id], (oldData: KelasWithMemberCount[] | undefined) => {
                if (!oldData) return oldData
                return oldData.map(kelas => 
                    kelas.id === data.id 
                        ? { ...kelas, is_active: data.is_active, updated_at: data.updated_at }
                        : kelas
                )
            })

            // CRITICAL: Invalidate ALL siswa kelas queries karena perubahan status kelas
            // mempengaruhi visibility untuk siswa
            console.log('🔄 Invalidating all siswa kelas queries due to status change');
            queryClient.invalidateQueries({ queryKey: ['kelas', 'siswa'] })
            queryClient.refetchQueries({ queryKey: ['kelas', 'siswa'] })
        },
        onError: (error) => {
            console.error('❌ Hook: Toggle status failed:', error);
        }
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

            // Call function yang sudah ada di database
            const { data, error } = await supabase
                .rpc('join_kelas_by_code', {
                    p_kode_kelas: kodeKelas,
                    p_siswa_id: user.id
                })

            if (error) {
                console.error('Error joining kelas:', error)
                throw error
            }

            // Check if the function returned success
            if (data && typeof data === 'object' && 'success' in data) {
                if (data.success === false) {
                    // Throw error with specific message from the function
                    const errorMsg = data.message || 'Join kelas gagal';
                    console.error('RPC function returned failure:', data);
                    throw new Error(errorMsg);
                }
            }

            return data
        },
        onSuccess: () => {
            // Invalidate kelas siswa list untuk refresh data
            queryClient.invalidateQueries({ queryKey: ['kelas', 'siswa', user?.id] })
        },
    })
}