import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Insert']

export async function ensureProfileExists(
    userId: string,
    email: string,
    fullName?: string,
    role?: 'siswa' | 'guru'
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createClient()

        // Cek apakah profile sudah ada
        const { data: existingProfile, error: selectError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single()

        if (selectError && selectError.code !== 'PGRST116') {
            // Error selain "tidak ditemukan"
            return { success: false, error: selectError.message }
        }

        // Jika profile sudah ada
        if (existingProfile) {
            return { success: true }
        }

        // Buat profile baru
        const profileData: Profile = {
            id: userId,
            email: email,
            full_name: fullName || '',
            role: role || 'siswa'
        }

        const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData)

        if (insertError) {
            return { success: false, error: insertError.message }
        }

        return { success: true }
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

export async function getProfile(userId: string) {
    try {
        const supabase = createClient()

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            return { profile: null, error: error.message }
        }

        return { profile: data, error: null }
    } catch (error: unknown) {
        return {
            profile: null,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}
