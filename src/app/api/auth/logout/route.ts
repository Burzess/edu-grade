import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        
        const { error } = await supabase.auth.signOut()
        
        if (error) {
            return NextResponse.json(
                { error: 'Logout failed' },
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
        
    } catch (error: unknown) {
        console.error('Logout API error:', error)
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        )
    }
}

// Handle GET request juga untuk compatibility
export async function GET(request: NextRequest) {
    return POST(request)
}