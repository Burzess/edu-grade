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
    // Middleware integration
    isMiddlewareAuth: boolean // Flag untuk tahu data berasal dari middleware
    middlewareChecked: boolean // Flag untuk tahu middleware sudah dicek
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setLoading: (loading: boolean) => void
    setError: (error: string | null) => void
    logout: () => void
    reset: () => void
    // Middleware methods
    setMiddlewareAuth: (isMiddleware: boolean) => void
    setMiddlewareChecked: (checked: boolean) => void
    // Computed getters untuk mencegah re-computation
    isAuthenticated: () => boolean
    getUserRole: () => string | null
    isRole: (role: 'guru' | 'siswa') => boolean
    // Caching methods
    getCachedProfile: (userId: string) => Profile | null
    setCachedProfile: (userId: string, profile: Profile) => void
}

// Initial state untuk reset
const initialState = {
    user: null,
    profile: null,
    loading: true,
    error: null,
    lastUpdated: 0,
    profileCache: {},
    isMiddlewareAuth: false,
    middlewareChecked: false
}

export const useAuthStore = create<AuthState>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,
        
        setUser: (user) => {
            const currentState = get()
            if (currentState.user?.id !== user?.id) {
                set({ 
                    user, 
                    lastUpdated: Date.now(),
                    error: null // Clear error saat user berubah
                })
            }
        },
        
        setProfile: (profile) => {
            const currentState = get()
            if (currentState.profile?.id !== profile?.id || currentState.profile?.role !== profile?.role) {
                set({ 
                    profile, 
                    lastUpdated: Date.now(),
                    error: null
                })
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

        // Middleware methods
        setMiddlewareAuth: (isMiddleware: boolean) => {
            set({ isMiddlewareAuth: isMiddleware })
        },

        setMiddlewareChecked: (checked: boolean) => {
            set({ middlewareChecked: checked })
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

// Hook untuk mengambil minimal auth state yang dibutuhkan guards
export const useAuthGuardState = () => useAuthStore(state => ({
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    isAuthenticated: selectIsAuthenticated(state),
    userRole: selectUserRole(state)
}))