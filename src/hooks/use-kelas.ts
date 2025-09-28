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
            if (!user?.id || profile?.role !== 'guru') {
                return []
            }

            try {
                // Gunakan view yang sudah ada untuk guru
                const { data, error } = await supabase
                    .from('kelas_with_member_count')
                    .select('*')
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Error fetching kelas:', error)
                    throw error
                }

                return data as KelasWithMemberCount[]
            } catch (error) {
                console.error('useKelasGuru error:', error)
                throw error
            }
        },
        enabled: !!user?.id && profile?.role === 'guru',
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
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
                deskripsi: kelasData.deskripsi?.trim() || null,
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

// Hook untuk mendapatkan daftar kelas siswa
export function useKelasSiswa() {
    const { user, profile } = useAuthStore()

    return useQuery({
        queryKey: ['kelas', 'siswa', user?.id],
        queryFn: async () => {
            if (!user?.id || profile?.role !== 'siswa') {
                return []
            }

            try {
                const { data, error } = await supabase
                    .from('kelas_members')
                    .select(`
                        kelas_id,
                        joined_at,
                        kelas:kelas_id (
                            id,
                            nama_kelas,
                            deskripsi,
                            kode_kelas,
                            created_at,
                            profiles:created_by (
                                full_name
                            )
                        )
                    `)
                    .eq('siswa_id', user.id)
                    .order('joined_at', { ascending: false })

                if (error) {
                    console.error('Error fetching kelas siswa:', error)
                    throw error
                }

                // Transform data
                return data?.map((item: any) => ({
                    id: item.kelas?.id,
                    nama_kelas: item.kelas?.nama_kelas,
                    deskripsi: item.kelas?.deskripsi,
                    kode_kelas: item.kelas?.kode_kelas,
                    guru_name: Array.isArray(item.kelas?.profiles) 
                        ? item.kelas?.profiles[0]?.full_name 
                        : item.kelas?.profiles?.full_name,
                    joined_at: item.joined_at,
                    created_at: item.kelas?.created_at
                })) || []
            } catch (error) {
                console.error('useKelasSiswa error:', error)
                throw error
            }
        },
        enabled: !!user?.id && profile?.role === 'siswa',
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
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