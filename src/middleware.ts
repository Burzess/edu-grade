import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    // Update session first
    const response = await updateSession(request)

    // Parse URL
    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Blokir akses ke /register untuk semua user
    if (pathname.startsWith('/register')) {
        url.pathname = '/login'
        url.searchParams.set('error', 'register_disabled')
        return NextResponse.redirect(url)
    }

    // Public routes yang tidak perlu autentikasi
    const publicRoutes = ['/login', '/register', '/', '/auth/callback', '/unauthorized']
    const isPublicRoute = publicRoutes.includes(pathname)

    try {
        // Get user dengan timeout yang lebih singkat untuk responsive UI
        const supabase = await createClient()
        
        // Set timeout yang lebih singkat untuk middleware (1.5 detik)
        const authPromise = supabase.auth.getUser().catch((err) => {
            console.warn('Auth promise failed:', err)
            return { data: { user: null }, error: err }
        })
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth check timeout after 1.5s')), 1500)
        )

        const { data: { user }, error } = await Promise.race([
            authPromise,
            timeoutPromise
        ]).catch((raceError) => {
            console.warn('Auth race failed:', raceError)
            return { data: { user: null }, error: raceError }
        }) as any

        // Jika error atau timeout, allow public routes tapi redirect protected routes
        if (error || !user) {
            // Log untuk debugging
            console.log('Auth check failed:', {
                pathname,
                hasError: !!error,
                errorMessage: error?.message,
                hasUser: !!user,
                timestamp: new Date().toISOString()
            })

            if (!isPublicRoute) {
                url.pathname = '/login'
                
                // Categorize errors untuk better UX
                if (error?.message?.includes('JWT expired') || error?.message?.includes('refresh_token_not_found')) {
                    url.searchParams.set('error', 'session_expired')
                    url.searchParams.set('message', 'Session telah berakhir. Silakan login kembali.')
                } else if (error?.message?.includes('timeout')) {
                    url.searchParams.set('error', 'auth_timeout') 
                    url.searchParams.set('message', 'Koneksi lambat. Silakan coba lagi.')
                } else {
                    url.searchParams.set('error', 'auth_required')
                    url.searchParams.set('message', 'Silakan login untuk mengakses halaman ini.')
                }
                
                url.searchParams.set('redirect', pathname)
                return NextResponse.redirect(url)
            }
            return response
        }

        // Ambil role dengan priority: metadata > headers > database fallback
        let userRole = user.user_metadata?.role

        // Set user info di response headers untuk server components
        const modifiedResponse = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
        
        modifiedResponse.headers.set('x-user-id', user.id)
        modifiedResponse.headers.set('x-user-email', user.email || '')
        
        if (userRole) {
            modifiedResponse.headers.set('x-user-role', userRole)
        }

        // Jika tidak ada role di metadata, coba ambil dari database (dengan timeout)
        if (!userRole) {
            try {
                const profilePromise = (async () => {
                    try {
                        return await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', user.id)
                            .single()
                    } catch (err) {
                        console.warn('Profile query failed:', err)
                        return { data: null, error: err }
                    }
                })()
                
                const profileTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timeout after 1s')), 1000)
                )

                const result = await Promise.race([
                    profilePromise,
                    profileTimeoutPromise
                ]).catch((raceError) => {
                    console.warn('Profile race failed:', raceError)
                    return { data: null, error: raceError }
                }) as any

                const { data: profile, error: profileError } = result

                if (profile?.role) {
                    userRole = profile.role
                    modifiedResponse.headers.set('x-user-role', userRole)
                } else {
                    console.warn('No profile role found, using fallback. Error:', profileError)
                    // Fallback ke siswa jika tidak bisa ambil role
                    userRole = 'siswa'
                    modifiedResponse.headers.set('x-user-role', userRole)
                    modifiedResponse.headers.set('x-role-fallback', 'true')
                }
            } catch (profileError) {
                console.warn('Profile fetch failed completely, using fallback role:', profileError)
                // Fallback ke siswa jika tidak bisa ambil role
                userRole = 'siswa'
                modifiedResponse.headers.set('x-user-role', userRole)
                modifiedResponse.headers.set('x-role-fallback', 'true')
            }
        }

        // Redirect logic dengan role yang sudah didapat
        if (userRole) {
            // Redirect ke dashboard sesuai role jika di root
            if (pathname === '/') {
                url.pathname = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'
                return NextResponse.redirect(url)
            }

            // Proteksi route berdasarkan role
            if (pathname.startsWith('/guru') && userRole !== 'guru') {
                url.pathname = '/siswa/dashboard'
                url.searchParams.set('error', 'access_denied')
                return NextResponse.redirect(url)
            }

            if (pathname.startsWith('/siswa') && userRole !== 'siswa') {
                url.pathname = '/guru/dashboard'
                url.searchParams.set('error', 'access_denied')
                return NextResponse.redirect(url)
            }

            // Redirect ke dashboard jika sudah login dan mencoba akses login
            if ((pathname === '/login' || pathname === '/register') && userRole) {
                url.pathname = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'
                return NextResponse.redirect(url)
            }
        }

        return modifiedResponse

    } catch (middlewareError: any) {
        // Log error dengan detail untuk debugging
        console.error('Middleware error details:', {
            pathname,
            error: middlewareError?.message || 'Unknown error',
            stack: middlewareError?.stack,
            isPublicRoute,
            timestamp: new Date().toISOString()
        })
        
        // Jika terjadi error di middleware, allow public routes
        if (isPublicRoute) {
            console.log(`Allowing public route ${pathname} despite middleware error`)
            return response
        }
        
        // Untuk protected routes, redirect dengan error info yang lebih specific
        url.pathname = '/login'
        
        // Categorize error untuk better UX
        if (middlewareError?.message?.includes('timeout')) {
            url.searchParams.set('error', 'auth_timeout')
            url.searchParams.set('message', 'Timeout saat verifikasi session. Silakan login kembali.')
        } else if (middlewareError?.message?.includes('network')) {
            url.searchParams.set('error', 'network_error')
            url.searchParams.set('message', 'Koneksi bermasalah. Periksa internet Anda.')
        } else {
            url.searchParams.set('error', 'middleware_error')
            url.searchParams.set('message', 'Terjadi kesalahan sistem. Silakan coba lagi.')
        }
        
        url.searchParams.set('redirect', pathname)
        return NextResponse.redirect(url)
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}