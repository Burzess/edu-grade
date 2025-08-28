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
        // Get user with timeout untuk menghindari hanging
        const supabase = await createClient()
        
        // Set timeout untuk auth check
        const authPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 3000)
        )

        const { data: { user }, error } = await Promise.race([
            authPromise,
            timeoutPromise
        ]) as any

        // Jika error atau timeout, allow public routes tapi redirect protected routes
        if (error || !user) {
            if (!isPublicRoute) {
                url.pathname = '/login'
                url.searchParams.set('error', 'session_expired')
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
                const profilePromise = supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                
                const profileTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
                )

                const { data: profile } = await Promise.race([
                    profilePromise,
                    profileTimeoutPromise
                ]) as any

                userRole = profile?.role
                
                if (userRole) {
                    modifiedResponse.headers.set('x-user-role', userRole)
                }
            } catch (profileError) {
                console.warn('Profile fetch failed, using fallback role:', profileError)
                // Fallback ke siswa jika tidak bisa ambil role
                userRole = 'siswa'
                modifiedResponse.headers.set('x-user-role', userRole)
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

    } catch (middlewareError) {
        console.error('Middleware error:', middlewareError)
        
        // Jika terjadi error di middleware, allow public routes
        if (isPublicRoute) {
            return response
        }
        
        // Redirect ke login jika error di protected route
        url.pathname = '/login'
        url.searchParams.set('error', 'middleware_error')
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
