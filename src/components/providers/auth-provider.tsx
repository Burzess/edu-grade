'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { ensureProfileExists } from '@/lib/profile-utils'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useCallback } from 'react'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'

interface AuthContextType {
    signUp: (email: string, password: string, fullName: string, role: 'siswa' | 'guru') => Promise<{ user: any; session: any }>
    signIn: (email: string, password: string) => Promise<{ user: any; session: any; profile: { role: 'guru' | 'siswa' } | null }>
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
            console.log('🚀 Using server-side initial user:', initialUser.email)
            
            // Set profile langsung dari server data
            const serverProfile = {
                id: initialUser.id,
                email: initialUser.email,
                full_name: initialUser.full_name,
                role: initialUser.role as 'siswa' | 'guru',
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
            // Set timeout untuk mencegah hanging (kurangi dari 10 detik ke 5 detik)
            const controller = new AbortController()
            const timeoutId = setTimeout(() => {
                controller.abort()
                console.error('⏰ Profile fetch timeout after 5 seconds')
            }, 5000) // Kurangi ke 5 detik

            // Cek cache terlebih dahulu dengan validasi yang lebih ketat
            const cachedProfile = getCachedProfile(user.id)
            if (cachedProfile && cachedProfile.email && cachedProfile.role) {
                console.log('🔄 Using cached profile for user:', user.id)
                setProfile(cachedProfile)
                clearTimeout(timeoutId)
                return
            }

            // Coba ambil dari metadata dulu (lebih cepat) dengan validasi
            const metadata = user.user_metadata || {}
            if (metadata.role && metadata.full_name && user.email) {
                const quickProfile = {
                    id: user.id,
                    email: user.email,
                    full_name: metadata.full_name,
                    role: metadata.role as 'siswa' | 'guru',
                    created_at: user.created_at
                }
                console.log('⚡ Using metadata profile for user:', user.id)
                setProfile(quickProfile)
                setCachedProfile(user.id, quickProfile)
                clearTimeout(timeoutId)
                return
            }

            // Check network connectivity
            if (!navigator.onLine) {
                console.warn('🔌 No internet connection, using fallback profile')
                clearTimeout(timeoutId)
                const fallbackProfile = {
                    id: user.id,
                    email: user.email!,
                    full_name: user.email?.split('@')[0] || 'User',
                    role: (metadata.role as 'siswa' | 'guru') || 'siswa',
                    created_at: user.created_at
                }
                setProfile(fallbackProfile)
                setCachedProfile(user.id, fallbackProfile)
                return
            }

            // Fallback ke database query dengan retry logic yang dipercepat
            console.log('📡 Fetching profile from database for user:', user.id)
            let retries = 2 // Kurangi dari 3 ke 2 retry
            let profileData = null

            while (retries > 0 && !profileData && !controller.signal.aborted) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()

                    if (data) {
                        profileData = data
                        setProfile(data)
                        setCachedProfile(user.id, data)
                        break
                    } else if (error) {
                        if (error.code === 'PGRST116') {
                            // Profile not found, create quickly
                            console.log('Profile not found, creating...')
                            const result = await ensureProfileExists(
                                user.id,
                                user.email!,
                                metadata.full_name || user.email?.split('@')[0] || 'User',
                                (metadata.role as 'siswa' | 'guru') || 'siswa'
                            )
                            
                            if (result.success) {
                                // Try fetch again after creation
                                const { data: newProfile } = await supabase
                                    .from('profiles')
                                    .select('*')
                                    .eq('id', user.id)
                                    .single()
                                
                                if (newProfile) {
                                    profileData = newProfile
                                    setProfile(newProfile)
                                    setCachedProfile(user.id, newProfile)
                                    break
                                }
                            }
                        } else {
                            throw error
                        }
                    }
                } catch (fetchError: any) {
                    if (fetchError.name === 'AbortError') {
                        console.error('⏰ Profile fetch aborted due to timeout')
                        break
                    }
                    
                    retries--
                    console.warn(`⚠️ Profile fetch failed, ${retries} retries left:`, fetchError)
                    
                    if (retries > 0) {
                        // Kurangi delay retry dari exponential backoff
                        await new Promise(resolve => setTimeout(resolve, 500))
                    }
                }
            }

            clearTimeout(timeoutId)

            // Jika setelah retry masih gagal atau timeout, buat profile fallback
            if (!profileData || controller.signal.aborted) {
                console.warn('⚠️ Unable to fetch/create profile, using emergency fallback')
                const emergencyProfile = {
                    id: user.id,
                    email: user.email!,
                    full_name: metadata.full_name || user.email?.split('@')[0] || 'User',
                    role: (metadata.role as 'siswa' | 'guru') || 'siswa',
                    created_at: user.created_at
                }
                setProfile(emergencyProfile)
                setCachedProfile(user.id, emergencyProfile)
                
                // Schedule background sync untuk update profile nanti
                setTimeout(() => {
                    console.log('🔄 Attempting background profile sync...')
                    getProfile(user).catch(console.error)
                }, 10000)
            }

        } catch (err: unknown) {
            console.error('❌ Critical error in getProfile:', err)
            // Fallback profile untuk mencegah stuck loading
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

    const signIn = async (email: string, password: string): Promise<{ user: any; session: any; profile: { role: 'guru' | 'siswa' } | null }> => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        console.log('SignIn result:', data)
        console.log('SignIn error:', error)

        if (error) throw error

        let userProfile: { role: 'guru' | 'siswa' } | null = null

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
                    userProfile = { role: profileData.role as 'guru' | 'siswa' }
                    setProfile(profileData)
                    setCachedProfile(data.user.id, profileData)
                } else {
                    // Fallback ke metadata jika profile tidak ada
                    const metadata = data.user.user_metadata || {}
                    userProfile = { role: (metadata.role as 'guru' | 'siswa') || 'siswa' }
                    await getProfile(data.user)
                }
            } catch (profileErr) {
                console.error('Error fetching profile during signIn:', profileErr)
                // Fallback ke getProfile async
                await getProfile(data.user)
                const metadata = data.user.user_metadata || {}
                userProfile = { role: (metadata.role as 'guru' | 'siswa') || 'siswa' }
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
