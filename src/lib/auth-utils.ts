/**
 * Auth utilities untuk managing cache dan navigation
 */

import { clearAuthCache } from '@/hooks/use-middleware-auth'

/**
 * Utility untuk logout dengan clear cache
 */
export async function performLogout() {
  try {
    // Clear auth cache
    clearAuthCache()
    
    // Clear all auth-related storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth-quick-cache')
      localStorage.removeItem('auth-data') // jika ada
    }

    // Logout dari Supabase
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()

    // Redirect ke login
    window.location.href = '/login'
  } catch (error) {
    console.error('Error during logout:', error)
    // Force redirect walaupun ada error
    window.location.href = '/login'
  }
}

/**
 * Utility untuk refresh auth cache
 * Gunakan ketika ada perubahan role atau profile
 */
export function refreshAuthCache() {
  clearAuthCache()
  // Trigger re-fetch dengan refresh halaman
  window.location.reload()
}

/**
 * Check apakah auth cache masih valid
 */
export function isAuthCacheValid(): boolean {
  if (typeof window === 'undefined') return false
  
  const cached = sessionStorage.getItem('auth-quick-cache')
  if (!cached) return false
  
  try {
    const parsed = JSON.parse(cached)
    const isRecent = Date.now() - parsed.timestamp < 30000 // 30 detik
    return isRecent
  } catch {
    return false
  }
}