'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-semibold">Gagal Memuat Dashboard</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {error.message || 'Terjadi kesalahan saat memuat data dashboard'}
        </p>
        <Button onClick={reset}>Coba Lagi</Button>
      </div>
    </div>
  )
}
