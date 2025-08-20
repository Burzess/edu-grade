import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
    // Update session
    const response = await updateSession(request)

    // Get user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    const pathname = url.pathname

    // Public routes yang tidak perlu autentikasi
    const publicRoutes = ['/login', '/register', '/', '/auth/callback']
    const isPublicRoute = publicRoutes.includes(pathname)

    // Jika user belum login dan mencoba akses route protected
    if (!user && !isPublicRoute) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Jika user sudah login, ambil role dari user_metadata untuk menghindari DB query
    if (user) {
        // Coba ambil role dari metadata dulu (lebih cepat)
        let userRole = user.user_metadata?.role
        
        // Jika tidak ada di metadata, baru query database (fallback)
        if (!userRole) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
            userRole = profile?.role
        }

        // Redirect ke dashboard sesuai role jika di root
        if (pathname === '/') {
            if (userRole === 'guru') {
                url.pathname = '/guru/dashboard'
                return NextResponse.redirect(url)
            } else if (userRole === 'siswa') {
                url.pathname = '/siswa/dashboard'
                return NextResponse.redirect(url)
            }
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

        // Redirect ke dashboard jika sudah login dan mencoba akses login/register
        if (isPublicRoute && pathname !== '/') {
            if (userRole === 'guru') {
                url.pathname = '/guru/dashboard'
                return NextResponse.redirect(url)
            } else if (userRole === 'siswa') {
                url.pathname = '/siswa/dashboard'
                return NextResponse.redirect(url)
            }
        }
    }

    return response
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
