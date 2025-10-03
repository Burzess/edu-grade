import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    
    // Update session dari Supabase
    const response = await updateSession(request)
    
    // Public routes yang tidak perlu autentikasi
    const publicRoutes = ['/login', '/register', '/auth/callback', '/unauthorized']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
    
    // Blokir akses ke /register
    if (pathname.startsWith('/register')) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'register_disabled')
        return NextResponse.redirect(url)
    }
    
    // Jika route public, lewati
    if (isPublicRoute) {
        return response
    }
    
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        // Jika tidak ada user atau error, redirect ke login
        if (error || !user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('message', 'Silakan login terlebih dahulu')
            return NextResponse.redirect(url)
        }
        
        // Ambil role user dengan caching untuk mengurangi database queries
        let userRole: 'guru' | 'siswa' = 'siswa'
        
        // Cek metadata terlebih dahulu sebelum query database
        if (user.user_metadata?.role) {
            userRole = user.user_metadata.role
        } else if (user.email?.includes('guru')) {
            userRole = 'guru'
        } else {
            // Hanya query database jika tidak ada metadata
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                
                if (profile?.role) {
                    userRole = profile.role
                }
            } catch (error) {
                console.warn('Failed to fetch user role from database:', error)
                // Keep fallback userRole = 'siswa'
            }
        }
        
        const url = request.nextUrl.clone()
        
        // Redirect dari root ke dashboard sesuai role
        if (pathname === '/') {
            url.pathname = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'
            return NextResponse.redirect(url)
        }
        
        // Proteksi route berdasarkan role
        if (pathname.startsWith('/guru') && userRole !== 'guru') {
            url.pathname = '/siswa/dashboard'
            return NextResponse.redirect(url)
        }
        
        if (pathname.startsWith('/siswa') && userRole !== 'siswa') {
            url.pathname = '/guru/dashboard'
            return NextResponse.redirect(url)
        }
        
        // Redirect jika sudah login tapi akses halaman login
        if (pathname === '/login') {
            url.pathname = userRole === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'
            return NextResponse.redirect(url)
        }
        
        // Set headers untuk client
        const modifiedResponse = NextResponse.next({
            request: {
                headers: request.headers,
            },
        })
        
        modifiedResponse.headers.set('x-user-id', user.id)
        modifiedResponse.headers.set('x-user-email', user.email || '')
        modifiedResponse.headers.set('x-user-role', userRole)
        
        return modifiedResponse
        
    } catch (error) {
        console.error('Middleware error:', error)
        
        // Jika terjadi error, redirect ke login untuk protected routes
        const url = request.nextUrl.clone()
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