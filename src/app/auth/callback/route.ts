import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data.user) {
            // Pastikan profile ada setelah email confirmation
            try {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', data.user.id)
                    .single()

                // Jika profile belum ada, buat manual
                if (!existingProfile) {
                    const metadata = data.user.user_metadata || {}
                    await supabase
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email!,
                            full_name: metadata.full_name || '',
                            role: (metadata.role as 'siswa' | 'guru') || 'siswa',
                        })
                }
            } catch (profileError) {
                console.error('Error creating profile in callback:', profileError)
                // Jangan fail redirect, user tetap bisa login
            }

            // Redirect to dashboard based on role (middleware will handle this)
            return NextResponse.redirect(`${origin}/`)
        }
    }

    // Return to login if something went wrong
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}