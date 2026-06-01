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
    profileCache: { [userId: string]: { profile: Profile; timestamp: number } }
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    logout: () => void
    reset: () => void
    // Computed getters untuk mencegah re-computation
    isAuthenticated: () => boolean
    getUserRole: () => string | null
    isRole: (role: 'guru' | 'siswa' | 'admin') => boolean
    // Caching methods
    getCachedProfile: (userId: string) => Profile | null
    setCachedProfile: (userId: string, profile: Profile) => void
}

// Initial state untuk reset
const getInitialState = () => {
    // Check session storage untuk state yang di-cache
    if (typeof window !== 'undefined') {
        try {
            const cached = sessionStorage.getItem('auth-state-cache')
            if (cached) {
                const parsed = JSON.parse(cached)
                // Hanya gunakan cache jika masih fresh (< 5 menit)
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                    return {
                        ...parsed.state,
                        loading: false, // Set loading false jika ada cache
                        lastUpdated: parsed.timestamp
                    }
                }
            }
        } catch (_error: unknown) {
            // Failed to parse auth cache, use defaults
        }
    }
    
    return {
        user: null,
        profile: null,
        loading: true,
        error: null,
        lastUpdated: 0,
        profileCache: {}
    }
}

const initialState = getInitialState()

export const useAuthStore = create<AuthState>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,
        
        setUser: (user) => {
            const currentState = get()
            if (currentState.user?.id !== user?.id) {
                const newState = { 
                    user, 
                    lastUpdated: Date.now(),
                    error: null // Clear error saat user berubah
                }
                set(newState)
                
                // Cache ke session storage untuk navigasi yang smooth
                if (typeof window !== 'undefined' && user) {
                    try {
                        sessionStorage.setItem('auth-state-cache', JSON.stringify({
                            state: { ...get(), ...newState },
                            timestamp: Date.now()
                        }))
                    } catch (_error: unknown) {
                        // Failed to cache auth state
                    }
                }
            }
        },
        
        setProfile: (profile) => {
            const currentState = get()
            if (
                currentState.profile?.id !== profile?.id ||
                currentState.profile?.role !== profile?.role ||
                currentState.profile?.full_name !== profile?.full_name ||
                currentState.profile?.email !== profile?.email
            ) {
                const newState = { 
                    profile, 
                    lastUpdated: Date.now(),
                    error: null
                }
                set(newState)
                
                // Cache ke session storage
                if (typeof window !== 'undefined' && profile) {
                    try {
                        sessionStorage.setItem('auth-state-cache', JSON.stringify({
                            state: { ...get(), ...newState },
                            timestamp: Date.now()
                        }))
                    } catch (_error: unknown) {
                        // Failed to cache auth state
                    }
                }
            }
        },
        
        setLoading: (loading) => {
            const currentState = get()
            if (currentState.loading !== loading) {
                set({ loading })
            }
        },
        
        setError: (error) => {
            const currentState = get()
            if (currentState.error !== error) {
                set({ error, loading: false })
            }
        },
        
        logout: () => {
            set({ 
                user: null,
                profile: null,
                loading: false,
                error: null,
                lastUpdated: Date.now(),
                profileCache: {}
            })
            
            // Clear session storage cache
            if (typeof window !== 'undefined') {
                try {
                    sessionStorage.removeItem('auth-state-cache')
                } catch (_error: unknown) {
                    // Failed to clear auth cache
                }
            }
        },
        
        reset: () => {
            set({ 
                ...initialState,
                lastUpdated: Date.now()
            })
        },

        // Caching methods dengan optimasi
        getCachedProfile: (userId: string) => {
            const { profileCache } = get()
            const cached = profileCache[userId]
            // Perpanjang cache time ke 10 menit untuk mengurangi fetch
            if (cached && (Date.now() - cached.timestamp < 10 * 60 * 1000)) {
                return cached.profile
            }
            return null
        },

        setCachedProfile: (userId: string, profile: Profile) => {
            const currentState = get()
            const existing = currentState.profileCache[userId]
            
            // Only update if profile actually changed atau belum ada cache
            if (!existing || 
                existing.profile.id !== profile.id || 
                existing.profile.role !== profile.role ||
                existing.profile.full_name !== profile.full_name) {
                set((state) => ({
                    profileCache: {
                        ...state.profileCache,
                        [userId]: {
                            profile,
                            timestamp: Date.now()
                        }
                    }
                }))
            }
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

// Stable selectors untuk mencegah unnecessary re-renders
export const selectUser = (state: AuthState) => state.user
export const selectProfile = (state: AuthState) => state.profile
export const selectLoading = (state: AuthState) => state.loading
export const selectError = (state: AuthState) => state.error
export const selectIsAuthenticated = (state: AuthState) => !!(state.user && state.profile)
export const selectUserRole = (state: AuthState) => state.profile?.role || state.user?.user_metadata?.role || null

// Selector hooks yang stable
export const useUser = () => useAuthStore(selectUser)
export const useProfile = () => useAuthStore(selectProfile)
export const useAuthLoading = () => useAuthStore(selectLoading)
export const useAuthError = () => useAuthStore(selectError)
export const useIsAuthenticated = () => useAuthStore(selectIsAuthenticated)
export const useUserRole = () => useAuthStore(selectUserRole)

// Custom hooks untuk specific role checks
export const useIsGuru = () => useAuthStore(state => selectUserRole(state) === 'guru')
export const useIsSiswa = () => useAuthStore(state => selectUserRole(state) === 'siswa')
export const useIsAdmin = () => useAuthStore(state => selectUserRole(state) === 'admin')

// Hook untuk mengambil minimal auth state yang dibutuhkan guards
export const useAuthGuardState = () => useAuthStore(state => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: selectIsAuthenticated(state),
    userRole: selectUserRole(state)
}))
