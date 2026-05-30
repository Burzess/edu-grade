import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/types/auth'
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
                // Security: Always default role to ROLES.SISWA. Admin/guru
                // escalation only via server-trusted path (seeded admin or
                // manual DB update by an existing admin). Never trust
                // client-supplied metadata.role at profile creation.
                if (!existingProfile) {
                    const metadata = data.user.user_metadata || {}
                    await supabase
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            email: data.user.email!,
                            full_name: metadata.full_name || '',
                            role: ROLES.SISWA,
                        })
                }
            } catch (_profileError) {
                // Jangan fail redirect, user tetap bisa login
            }

            // Redirect to dashboard based on role (middleware will handle this)
            return NextResponse.redirect(`${origin}/`)
        }
    }

    // Return to login if something went wrong
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
