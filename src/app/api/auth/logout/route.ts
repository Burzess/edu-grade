import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logoutLimiter } from '@/lib/rate-limit'
import { getClientIp, checkRateLimit } from '@/lib/api/check-rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        // Rate limit: 3 requests per minute per IP
        const limited = checkRateLimit(logoutLimiter(getClientIp(request)))
        if (limited) return limited

        const supabase = await createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            return NextResponse.json(
                { error: 'Gagal melakukan logout' },
                { status: 400 }
            )
        }
        
        const response = NextResponse.json(
            { 
                success: true, 
                message: 'Logout berhasil',
                clearCache: true
            },
            { status: 200 }
        )
        
        response.headers.set('x-logout-success', 'true')
        if (user?.id) {
            response.headers.set('x-logout-user-id', user.id)
        }
        
        return response
        
    } catch (_error: unknown) {
        return NextResponse.json(
            { error: 'Terjadi kesalahan pada server' },
            { status: 500 }
        )
    }
}

// Handle GET request juga untuk compatibility
export async function GET(request: NextRequest) {
    return POST(request)
}
