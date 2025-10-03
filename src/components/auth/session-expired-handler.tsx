'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, RefreshCw, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { clearAuthCache } from '@/hooks/use-middleware-auth'

export function SessionExpiredHandler() {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshAttempts, setRefreshAttempts] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const redirectPath = searchParams.get('redirect') || '/siswa/dashboard'
  const errorType = searchParams.get('error')
  
  // Only show this component for session-related errors
  if (!['session_expired', 'auth_timeout', 'auth_required'].includes(errorType || '')) {
    return null
  }

  const handleRefreshSession = async () => {
    if (refreshAttempts >= 2) {
      // Max 2 attempts to avoid infinite loops
      return
    }

    setRefreshing(true)
    setRefreshAttempts(prev => prev + 1)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.refreshSession()
      
      if (!error) {
        // Clear auth cache to force re-fetch
        clearAuthCache()
        
        // Small delay untuk session to propagate
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Redirect to original destination
        router.push(redirectPath)
        return
      }
      
      console.error('Session refresh failed:', error.message)
    } catch (error) {
      console.error('Session refresh error:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogin = () => {
    clearAuthCache()
    // Remove error params to clean URL
    const url = new URL(window.location.pathname, window.location.origin)
    url.searchParams.set('redirect', redirectPath)
    router.push(`/login?${url.searchParams.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-xl">Session Berakhir</CardTitle>
          <CardDescription>
            Session login Anda telah berakhir atau tidak valid
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {errorType === 'session_expired' && 'Session login telah berakhir. Anda perlu login ulang.'}
              {errorType === 'auth_timeout' && 'Koneksi lambat saat verifikasi session. Coba refresh atau login ulang.'}
              {errorType === 'auth_required' && 'Anda perlu login untuk mengakses halaman ini.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            {refreshAttempts < 2 && errorType !== 'auth_required' && (
              <Button 
                onClick={handleRefreshSession} 
                disabled={refreshing}
                className="w-full"
                variant="outline"
              >
                {refreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Menyegarkan Session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Coba Refresh Session
                  </>
                )}
              </Button>
            )}
            
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Login Ulang
            </Button>
          </div>

          {redirectPath !== '/siswa/dashboard' && (
            <p className="text-sm text-muted-foreground text-center">
              Setelah login, Anda akan diarahkan ke: <br />
              <code className="bg-muted px-1 py-0.5 rounded text-xs">{redirectPath}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}