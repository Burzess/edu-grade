import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
    user: User | null
    profile: Profile | null
    loading: boolean
    setUser: (user: User | null) => void
    setProfile: (profile: Profile | null) => void
    setLoading: (loading: boolean) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,
    setUser: (user) => {
        set({ user })
    },
    setProfile: (profile) => {
        set({ profile })
    },
    setLoading: (loading) => {
        set({ loading })
    },
    logout: () => {
        set({ user: null, profile: null, loading: false })
    },
}))
