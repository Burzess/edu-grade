import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        console.log('🚪 Logout API called')
        
        const supabase = await createClient()
        
        // Get current user untuk logging
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
            console.log('👤 Logging out user:', user.email, user.id)
        }
        
        // Supabase logout
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            console.error('❌ Logout error:', error.message)
            return NextResponse.json(
                { error: 'Logout failed', message: error.message },
                { status: 400 }
            )
        }
        
        console.log('✅ Logout successful')
        
        // Response dengan instruction untuk clear cache di middleware
        const response = NextResponse.json(
            { 
                success: true, 
                message: 'Logout berhasil',
                clearCache: true,
                userId: user?.id
            },
            { status: 200 }
        )
        
        // Set header untuk middleware detection
        response.headers.set('x-logout-success', 'true')
        if (user?.id) {
            response.headers.set('x-logout-user-id', user.id)
        }
        
        return response
        
    } catch (error: any) {
        console.error('❌ Logout API error:', error)
        return NextResponse.json(
            { error: 'Logout failed', message: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}

// Handle GET request juga untuk compatibility
export async function GET(request: NextRequest) {
    return POST(request)
}