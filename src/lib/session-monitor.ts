'use client'

import { createClient } from '@/lib/supabase/client'
import { clearAuthCache } from '@/hooks/use-middleware-auth'

let sessionMonitorInterval: NodeJS.Timeout | null = null
let lastSessionCheck = 0

/**
 * Monitor session expiration dan lakukan auto-refresh jika perlu
 */
export function startSessionMonitor() {
  // Jangan start multiple monitors
  if (sessionMonitorInterval) return

  console.log('🔍 Starting session monitor...')

  sessionMonitorInterval = setInterval(async () => {
    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.warn('Session check error:', error.message)
        return
      }

      if (!session) {
        console.log('No session found, stopping monitor')
        stopSessionMonitor()
        return
      }

      const now = Date.now() / 1000
      const expiresAt = session.expires_at || 0
      const timeUntilExpiry = expiresAt - now

      console.log(`⏰ Session expires in ${Math.round(timeUntilExpiry / 60)} minutes`)

      // Refresh jika session akan expired dalam 5 menit
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        console.log('🔄 Session will expire soon, refreshing...')
        
        const { error: refreshError } = await supabase.auth.refreshSession()
        
        if (refreshError) {
          console.error('❌ Auto session refresh failed:', refreshError.message)
          // Clear cache dan redirect ke login
          clearAuthCache()
          window.location.href = '/login?error=session_expired&message=Session berakhir, silakan login ulang'
        } else {
          console.log('✅ Session refreshed automatically')
          // Clear auth cache to force re-fetch updated session
          clearAuthCache()
        }
      }

      // Jika session sudah expired
      if (timeUntilExpiry <= 0) {
        console.log('❌ Session has expired')
        clearAuthCache()
        stopSessionMonitor()
        window.location.href = '/login?error=session_expired&message=Session telah berakhir'
      }

      lastSessionCheck = now

    } catch (error) {
      console.error('Session monitor error:', error)
    }
  }, 60000) // Check setiap 1 menit
}

/**
 * Stop session monitoring
 */
export function stopSessionMonitor() {
  if (sessionMonitorInterval) {
    console.log('⏹️ Stopping session monitor')
    clearInterval(sessionMonitorInterval)
    sessionMonitorInterval = null
  }
}

/**
 * Get session info untuk debugging
 */
export async function getSessionInfo() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    return { valid: false, error: error?.message }
  }

  const now = Date.now() / 1000
  const expiresAt = session.expires_at || 0
  const timeUntilExpiry = expiresAt - now

  return {
    valid: timeUntilExpiry > 0,
    expiresAt: new Date(expiresAt * 1000).toLocaleString(),
    timeUntilExpiry: Math.round(timeUntilExpiry / 60), // in minutes
    userId: session.user?.id,
    email: session.user?.email,
    role: session.user?.user_metadata?.role
  }
}

/**
 * Hook untuk auto-start monitoring saat component mount
 */
export function useSessionMonitor() {
  if (typeof window !== 'undefined') {
    // Start monitor saat component mount
    startSessionMonitor()

    // Cleanup saat unmount
    return () => stopSessionMonitor()
  }
}