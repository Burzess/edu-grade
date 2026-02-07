import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase Browser Client - Best Practice 2026
 * 
 * Gunakan client ini untuk:
 * - Client Components
 * - React hooks
 * - Realtime subscriptions
 * 
 * Client ini secara otomatis:
 * - Menggunakan cookies untuk session management
 * - Menggunakan PKCE flow untuk auth
 * - Menangani token refresh
 * 
 * TIPS:
 * - Gunakan getSession() atau getUser() untuk mendapatkan user di client
 * - Untuk realtime, gunakan supabase.channel()
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
