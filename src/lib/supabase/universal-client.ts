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

  // Channel methods - REALTIME REMOVED: Disabled to prevent infinite requests
  channel(name: string) {
    console.log('Supabase Channel: DISABLED - realtime functionality removed')
    // Return mock channel that does nothing
    return {
      on: () => this,
      subscribe: () => ({ 
        status: 'CLOSED',
        unsubscribe: () => {}
      }),
      unsubscribe: () => {},
      send: () => Promise.resolve('ok')
    }
  }

  removeChannel(channel: any) {
    console.log('removeChannel: DISABLED - realtime functionality removed')
    return Promise.resolve('ok')
  }
}

// Export the universal client
export function createClient() {
  return new UniversalSupabaseClient()
}

// Re-export untuk backward compatibility
export { createClient as default }
