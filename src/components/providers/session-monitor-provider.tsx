'use client'

import { useEffect } from 'react'
import { startSessionMonitor, stopSessionMonitor } from '@/lib/session-monitor'
import { useMiddlewareAuth } from '@/hooks/use-middleware-auth'

interface SessionMonitorProviderProps {
  children: React.ReactNode
}

/**
 * Provider untuk auto-monitor session expiration
 * Start monitoring ketika user authenticated
 */
export function SessionMonitorProvider({ children }: SessionMonitorProviderProps) {
  const { isAuthenticated, loading } = useMiddlewareAuth()

  useEffect(() => {
    // Jangan start monitor jika masih loading atau tidak authenticated
    if (loading || !isAuthenticated) {
      stopSessionMonitor()
      return
    }

    // Start monitoring untuk authenticated users
    console.log('🔐 User authenticated, starting session monitor')
    startSessionMonitor()

    // Cleanup saat component unmount atau user logout
    return () => {
      console.log('🔐 Cleaning up session monitor')
      stopSessionMonitor()
    }
  }, [isAuthenticated, loading])

  return <>{children}</>
}

/**
 * Hook untuk manually trigger session check
 * Useful untuk debugging atau manual refresh
 */
export function useSessionCheck() {
  const checkSession = async () => {
    const { getSessionInfo } = await import('@/lib/session-monitor')
    return await getSessionInfo()
  }

  const refreshSession = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Manual session refresh failed:', error.message)
      return false
    }
    
    console.log('✅ Session refreshed manually')
    
    // Clear auth cache to force re-fetch
    const { clearAuthCache } = await import('@/hooks/use-middleware-auth')
    clearAuthCache()
    
    return true
  }

  return {
    checkSession,
    refreshSession
  }
}