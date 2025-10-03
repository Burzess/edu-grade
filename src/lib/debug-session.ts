/**
 * Debug utilities untuk troubleshooting session expired
 */

import { createClient } from '@/lib/supabase/client'

export async function debugSession() {
  const supabase = createClient()
  
  console.group('🔍 Session Debug Info')
  
  try {
    // Check current session
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    console.log('📝 Current Session:', {
      hasSession: !!session.session,
      sessionId: session.session?.access_token?.substring(0, 20) + '...',
      user: session.session?.user?.email,
      expiresAt: session.session?.expires_at ? new Date(session.session.expires_at * 1000).toLocaleString() : 'N/A',
      isExpired: session.session?.expires_at ? session.session.expires_at < Date.now() / 1000 : 'N/A',
      error: sessionError?.message
    })

    // Check user
    const { data: user, error: userError } = await supabase.auth.getUser()
    console.log('👤 User Data:', {
      hasUser: !!user.user,
      userId: user.user?.id,
      email: user.user?.email,
      role: user.user?.user_metadata?.role,
      error: userError?.message
    })

    // Check profile
    if (user.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .single()
      
      console.log('📋 Profile Data:', {
        hasProfile: !!profile,
        role: profile?.role,
        error: profileError?.message
      })
    }

    // Check auth cache
    if (typeof window !== 'undefined') {
      const authCache = sessionStorage.getItem('auth-quick-cache')
      if (authCache) {
        try {
          const parsed = JSON.parse(authCache)
          const age = Date.now() - parsed.timestamp
          console.log('💾 Auth Cache:', {
            age: `${Math.round(age / 1000)}s ago`,
            isValid: age < 30000,
            role: parsed.data?.userRole,
            isAuthenticated: parsed.data?.isAuthenticated
          })
        } catch (e) {
          console.log('💾 Auth Cache: Invalid JSON')
        }
      } else {
        console.log('💾 Auth Cache: Not found')
      }
    }

  } catch (error) {
    console.error('❌ Debug Error:', error)
  }
  
  console.groupEnd()
}

export async function refreshSession() {
  const supabase = createClient()
  
  console.log('🔄 Refreshing session...')
  
  try {
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ Refresh failed:', error.message)
      return false
    }
    
    console.log('✅ Session refreshed successfully')
    return true
  } catch (error) {
    console.error('❌ Refresh error:', error)
    return false
  }
}