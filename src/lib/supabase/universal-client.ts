import { createClient as createSupabaseClient } from '@/lib/supabase/client'
/**
 * Mock Supabase client yang akan menggantikan semua operasi database
 * dengan data demo ketika DEMO_MODE aktif
 */
class UniversalSupabaseClient {
  private isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
  private realClient: any

  constructor() {
    if (!this.isDemoMode) {
      this.realClient = createSupabaseClient()
    }
  }

  // Auth methods
  get auth() {
    if (this.isDemoMode) {
      return {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signUp: () => Promise.resolve({ data: null, error: { message: 'Demo mode: signUp disabled' } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Demo mode: use demo login' } }),
        signOut: () => Promise.resolve({ error: null })
      }
    }
    return this.realClient.auth
  }

  // Table operations
  from(table: string) {
    return this.realClient.from(table)
  }

  // Channel methods for real-time (disabled in demo)
  channel(name: string) {
    return this.realClient.channel(name)
  }

  removeChannel(channel: any) {
    return this.realClient.removeChannel(channel)
  }
}

// Export the universal client
export function createClient() {
  return new UniversalSupabaseClient()
}

// Re-export untuk backward compatibility
export { createClient as default }
