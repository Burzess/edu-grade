import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
    user: User | null
    profile: Profile | null
    loading: boolean
    error: string | null
    lastUpdated: number
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    logout: () => void
    reset: () => void
    // Computed getters untuk mencegah re-computation
    isAuthenticated: () => boolean
    getUserRole: () => string | null
    isRole: (role: 'guru' | 'siswa') => boolean
}

// Initial state untuk reset
const initialState = {
    user: null,
    profile: null,
    loading: true,
    error: null,
    lastUpdated: 0
}

export const useAuthStore = create<AuthState>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,
        
        setUser: (user) => {
            set({ 
                user, 
                lastUpdated: Date.now(),
                error: null // Clear error saat user berubah
            })
        },
        
        setProfile: (profile) => {
            set({ 
                profile, 
                lastUpdated: Date.now(),
                error: null
            })
        },
        
        setLoading: (loading) => {
            set({ loading })
        },
        
        setError: (error) => {
            set({ error, loading: false })
        },
        
        logout: () => {
            set({ 
                ...initialState,
                loading: false,
                lastUpdated: Date.now()
            })
        },
        
        reset: () => {
            set({ 
                ...initialState,
                lastUpdated: Date.now()
            })
        },

        // Computed getters - memoized untuk performance
        isAuthenticated: () => {
            const { user, profile } = get()
            return !!(user && profile)
        },
        
        getUserRole: () => {
            const { profile, user } = get()
            return profile?.role || user?.user_metadata?.role || null
        },
        
        isRole: (role) => {
            const userRole = get().getUserRole()
            return userRole === role
        }
    }))
)

// Selectors untuk mencegah unnecessary re-renders
export const useUser = () => useAuthStore(state => state.user)
export const useProfile = () => useAuthStore(state => state.profile)
export const useAuthLoading = () => useAuthStore(state => state.loading)
export const useAuthError = () => useAuthStore(state => state.error)
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated())
export const useUserRole = () => useAuthStore(state => state.getUserRole())

// Custom hooks untuk specific role checks
export const useIsGuru = () => useAuthStore(state => state.isRole('guru'))
export const useIsSiswa = () => useAuthStore(state => state.isRole('siswa'))

// Hook untuk mengambil minimal auth state yang dibutuhkan guards
export const useAuthGuardState = () => useAuthStore(state => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated(),
    getUserRole: state.getUserRole
}))