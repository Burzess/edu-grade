'use client'

import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface ImportProgressProps {
  processed: number
  total: number
}

export function ImportProgress({ processed, total }: ImportProgressProps) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="text-sm font-medium">
          Mengimport akun... ({processed}/{total})
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={percentage} className="h-3" />
        <p className="text-center text-sm text-muted-foreground">
          {percentage}% selesai
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Jangan tutup halaman ini selama proses import berlangsung.
      </p>
    </div>
  )
}
