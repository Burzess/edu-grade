'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { ensureProfileExists } from '@/lib/profile-utils'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect } from 'react'

interface AuthContextType {
    signUp: (email: string, password: string, fullName: string, role: 'siswa' | 'guru') => Promise<{ user: any; session: any }>
    signIn: (email: string, password: string) => Promise<any>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const router = useRouter()
    const { setUser, setProfile, setLoading, logout, getCachedProfile, setCachedProfile } = useAuthStore()

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                setUser(session.user)
                await getProfile(session.user)
            }
            setLoading(false)
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user)
                    await getProfile(session.user)
                } else {
                    logout()
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, setUser, setProfile, setLoading, logout])

    const getProfile = async (user: User) => {
        try {
            // Cek cache terlebih dahulu
            const cachedProfile = getCachedProfile(user.id)
            if (cachedProfile) {
                console.log('🔄 Using cached profile for user:', user.id)
                setProfile(cachedProfile)
                return
            }

            // Coba ambil dari metadata dulu (lebih cepat)
            const metadata = user.user_metadata || {}
            if (metadata.role && metadata.full_name) {
                const quickProfile = {
                    id: user.id,
                    email: user.email!,
                    full_name: metadata.full_name,
                    role: metadata.role as 'siswa' | 'guru',
                    created_at: user.created_at
                }
                setProfile(quickProfile)
                setCachedProfile(user.id, quickProfile)
                return
            }

            // Fallback ke database query
            console.log('📡 Fetching profile from database for user:', user.id)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (data) {
                setProfile(data)
                setCachedProfile(user.id, data) // Cache hasil
            } else if (error) {
                console.error('Error fetching profile:', error)
                // Jika profile tidak ditemukan, coba buat manual
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, creating...')
                    const result = await ensureProfileExists(
                        user.id,
                        user.email!,
                        metadata.full_name || '',
                        (metadata.role as 'siswa' | 'guru') || 'siswa'
                    )
                    
                    if (result.success) {
                        // Coba fetch ulang setelah dibuat
                        const { data: newProfile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', user.id)
                            .single()
                        
                        if (newProfile) {
                            setProfile(newProfile)
                            setCachedProfile(user.id, newProfile)
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error in getProfile:', err)
        }
    }

    const signUp = async (email: string, password: string, fullName: string, role: 'siswa' | 'guru') => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`
            }
        })

        if (error) throw error

        // Update user metadata agar role tersimpan di JWT untuk akses cepat
        if (data.user && data.session) {
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    role: role
                }
            })

            if (updateError) {
                console.warn('Warning: Could not update user metadata:', updateError)
            }

            const result = await ensureProfileExists(
                data.user.id,
                data.user.email!,
                fullName,
                role
            )

            if (!result.success) {
                console.error('Error ensuring profile exists:', result.error)
                // Jangan throw error, biarkan user tetap login
            }
        }

        // Return data untuk handle di UI
        return data
    }

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        console.log('SignIn result:', data)
        console.log('SignIn error:', error)

        if (error) throw error

        // Ensure user and profile are set immediately
        if (data.user) {
            setUser(data.user)
            await getProfile(data.user)
        }
        
        return data
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        logout()
        router.push('/login')
    }

    return (
        <AuthContext.Provider value={{ signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
