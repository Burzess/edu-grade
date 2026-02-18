'use client'

import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw, ArrowLeft, Info } from 'lucide-react'

export function MiddlewareErrorHandler() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const message = searchParams.get('message')
  const redirect = searchParams.get('redirect')

  if (!error) return null

  const getErrorDetails = (errorType: string) => {
    switch (errorType) {
      case 'middleware_error':
        return {
          title: 'Error Sistem',
          description: 'Terjadi kesalahan pada sistem middleware',
          color: 'bg-red-100 text-red-800',
          icon: AlertTriangle,
          severity: 'high'
        }
      case 'auth_timeout':
        return {
          title: 'Timeout Authentication',
          description: 'Proses verifikasi memakan waktu terlalu lama',
          color: 'bg-yellow-100 text-yellow-800',
          icon: AlertTriangle,
          severity: 'medium'
        }
      case 'network_error':
        return {
          title: 'Error Jaringan',
          description: 'Masalah koneksi internet atau server',
          color: 'bg-orange-100 text-orange-800',
          icon: AlertTriangle,
          severity: 'medium'
        }
      case 'session_expired':
        return {
          title: 'Session Berakhir',
          description: 'Session login telah habis masa berlakunya',
          color: 'bg-brand-100 text-brand-800',
          icon: Info,
          severity: 'low'
        }
      default:
        return {
          title: 'Error Tidak Dikenal',
          description: 'Terjadi kesalahan yang tidak dikenal',
          color: 'bg-gray-100 text-gray-800',
          icon: AlertTriangle,
          severity: 'medium'
        }
    }
  }

  const errorDetails = getErrorDetails(error)
  const Icon = errorDetails.icon

  return (
    <Card className="mb-6 border-l-4 border-l-red-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-50 dark:bg-red-950/20">
              <Icon className="h-5 w-5 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg text-red-800 dark:text-red-400">
                {errorDetails.title}
              </CardTitle>
              <p className="text-sm text-red-600 dark:text-red-500">
                {errorDetails.description}
              </p>
            </div>
          </div>
          <Badge className={errorDetails.color} variant="secondary">
            {error}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {message && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Detail:</strong> {message}
            </AlertDescription>
          </Alert>
        )}

        {redirect && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Halaman tujuan:</strong> {redirect}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
          
          <Button 
            onClick={() => window.history.back()} 
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>

          {redirect && (
            <Button 
              onClick={() => window.location.href = redirect} 
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              Ke Halaman Tujuan
            </Button>
          )}
        </div>

        {/* Debug info untuk development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs">
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify({
                error,
                message,
                redirect,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
              }, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )
}