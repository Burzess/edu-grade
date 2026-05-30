import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Supabase Server Client - Best Practice 2026
 * 
 * Gunakan client ini untuk:
 * - Server Components
 * - Server Actions  
 * - Route Handlers
 * 
 * PENTING dengan Fluid compute:
 * - Jangan simpan client di global variable
 * - Selalu buat client baru di setiap request/function
 * 
 * TIPS Keamanan:
 * - Gunakan getClaims() untuk validasi JWT (cepat, validasi signature)
 * - Gunakan getUser() jika perlu data user terbaru dari server
 * - JANGAN percaya getSession() untuk proteksi (bisa di-spoof)
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Method `setAll` dipanggil dari Server Component.
            // Ini bisa diabaikan jika Anda memiliki middleware/proxy
            // yang me-refresh user sessions.
          }
        },
      },
    }
  )
}

/**
 * Supabase Admin Client dengan Service Role Key
 * 
 * PERINGATAN: Hanya gunakan di server-side untuk operasi admin!
 * Service role key membypass RLS (Row Level Security).
 * 
 * Gunakan untuk:
 * - Operasi batch yang memerlukan akses penuh
 * - Migrasi data
 * - Webhook handlers
 * - Insert ke tabel dengan RLS restrictive (e.g. security_events)
 * 
 * NOTE: Menggunakan createClient dari @supabase/supabase-js (bukan createServerClient
 * dari @supabase/ssr) agar service role key benar-benar bypass RLS tanpa
 * terpengaruh cookie-based auth context.
 */
export async function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
