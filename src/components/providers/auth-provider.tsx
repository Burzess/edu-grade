'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { ensureProfileExists } from '@/lib/profile-utils'
import { UserRole } from '@/types/auth'
import {
  lookupCachedProfile,
  buildMetadataProfile,
  fetchProfileFromDB,
  buildFallbackProfile,
} from '@/lib/auth/profile-fetcher'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef } from 'react'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'

interface AuthContextType {
    signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ user: any; session: any }>
    signIn: (email: string, password: string) => Promise<{ user: any; session: any; profile: { role: UserRole } | null }>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ 
    children, 
    initialUser 
}: { 
    children: React.ReactNode;
    initialUser?: { id: string; email: string; role: string; full_name: string } | null;
}) {
    const supabase = createClient()
    const router = useRouter()
    const { setUser, setProfile, setLoading, logout, getCachedProfile, setCachedProfile } = useAuthStore()
    const wasAuthenticatedRef = useRef(!!initialUser)

    useEffect(() => {
        // Jika ada initialUser dari server, gunakan itu untuk menghindari loading
        if (initialUser) {
            console.log('Using server-side initial user:', initialUser.email)
            
            // Set profile langsung dari server data
            const serverProfile = {
                id: initialUser.id,
                email: initialUser.email,
                full_name: initialUser.full_name,
                role: initialUser.role as UserRole,
                created_at: new Date().toISOString()
            }

            // Buat minimal user object untuk compatibility
            const minimalUser = {
                id: initialUser.id,
                email: initialUser.email,
                user_metadata: {
                    role: initialUser.role,
                    full_name: initialUser.full_name
                },
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                email_confirmed_at: new Date().toISOString(),
                last_sign_in_at: new Date().toISOString(),
                role: 'authenticated',
                session_id: 'server-session'
            } as User

            setUser(minimalUser)
            setProfile(serverProfile)
            setCachedProfile(initialUser.id, serverProfile)
            setLoading(false)
            return
        }

        // Get initial session hanya jika tidak ada initialUser
        const getInitialSession = async () => {
            // Best practice: Gunakan getUser() untuk validasi token
            // getUser() memvalidasi dengan Supabase server, lebih reliable
            const { data: { user }, error } = await supabase.auth.getUser()

            if (user && !error) {
                setUser(user)
                await getProfile(user)
            }
            setLoading(false)
        }

        getInitialSession()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    wasAuthenticatedRef.current = true
                    setUser(session.user)
                    await getProfile(session.user)
                } else {
                    // Session expired or user signed out
                    const wasAuthenticated = wasAuthenticatedRef.current
                    wasAuthenticatedRef.current = false
                    logout()
                    
                    // If user was previously authenticated, redirect to login
                    if (wasAuthenticated && event !== 'SIGNED_OUT') {
                        console.warn('Session expired, redirecting to login')
                        window.location.href = '/login?error=session_expired'
                        return
                    }
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [supabase, setUser, setProfile, setLoading, logout, initialUser])

    // Proactively check session when the tab regains focus after being idle
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.hidden || !wasAuthenticatedRef.current) return
            
            try {
                const { data: { user }, error } = await supabase.auth.getUser()
                if (error || !user) {
                    // Session is no longer valid
                    console.warn('Session invalid after tab regained focus')
                    wasAuthenticatedRef.current = false
                    logout()
                    window.location.href = '/login?error=session_expired'
                }
            } catch {
                // Network error — don't redirect, let the user retry
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [supabase, logout])

    const getProfile = async (user: User) => {
        try {
            const metadata = user.user_metadata || {}

            // 1. Cache lookup
            const cached = lookupCachedProfile(user.id, getCachedProfile)
            if (cached) {
                setProfile(cached)
                return
            }

            // 2. Metadata fast path (no DB call)
            const metaProfile = buildMetadataProfile(
                user.id, user.email!, metadata, user.created_at
            )
            if (metaProfile) {
                setProfile(metaProfile)
                setCachedProfile(user.id, metaProfile)
                return
            }

            // 3. Offline fallback
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                const fallback = buildFallbackProfile(user.id, user.email!, metadata, user.created_at)
                setProfile(fallback)
                setCachedProfile(user.id, fallback)
                return
            }

            // 4. DB fetch (with creation if not found)
            const dbProfile = await fetchProfileFromDB(
                supabase,
                user.id,
                user.email!,
                (metadata.full_name as string) || user.email?.split('@')[0] || 'User',
                (metadata.role as UserRole) || 'siswa'
            )

            if (dbProfile) {
                setProfile(dbProfile)
                setCachedProfile(user.id, dbProfile)
                return
            }

            // 5. Emergency fallback
            const emergency = buildFallbackProfile(user.id, user.email!, metadata, user.created_at)
            setProfile(emergency)
            setCachedProfile(user.id, emergency)

        } catch (err: unknown) {
            console.error('Critical error in getProfile:', err)
            const emergencyProfile = {
                id: user.id,
                email: user.email!,
                full_name: user.email?.split('@')[0] || 'User',
                role: 'siswa' as const,
                created_at: user.created_at
            }
            setProfile(emergencyProfile)
        }
    }

    const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`
            }
        })

        if (error) throw error

        // Ensure profile exists in the database with the requested role.
        // Role assignment is handled server-side via the profiles table,
        // NOT via user_metadata (which is client-writable and insecure).
        if (data.user && data.session) {
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

    const signIn = async (email: string, password: string): Promise<{ user: any; session: any; profile: { role: UserRole } | null }> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        console.log('SignIn result:', data)
        console.log('SignIn error:', error)

        if (error) throw error

        let userProfile: { role: UserRole } | null = null

        // Ensure user and profile are set immediately
        if (data.user) {
            setUser(data.user)
            
            // Ambil profile dari database untuk mendapatkan role yang valid
            try {
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email, full_name, role, created_at')
                    .eq('id', data.user.id)
                    .single()
                
                if (profileData && !profileError) {
                    userProfile = { role: profileData.role as UserRole }
                    setProfile(profileData)
                    setCachedProfile(data.user.id, profileData)
                } else {
                    // Fallback ke metadata jika profile tidak ada
                    const metadata = data.user.user_metadata || {}
                    userProfile = { role: (metadata.role as UserRole) || 'siswa' }
                    await getProfile(data.user)
                }
            } catch (profileErr) {
                console.error('Error fetching profile during signIn:', profileErr)
                // Fallback ke getProfile async
                await getProfile(data.user)
                const metadata = data.user.user_metadata || {}
                userProfile = { role: (metadata.role as UserRole) || 'siswa' }
            }
        }
        
        return { ...data, profile: userProfile }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        logout()
        router.push('/login')
    }

    return (
        <AuthErrorBoundary>
            <AuthContext.Provider value={{ signUp, signIn, signOut }}>
                {children}
            </AuthContext.Provider>
        </AuthErrorBoundary>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
