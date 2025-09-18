import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStartUjian, useCompleteUjian } from '@/hooks/use-ujian'
import { toast } from 'sonner'
import { Play, Square, Clock, Users, FileText } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { id } from 'date-fns/locale'

interface UjianStatusCardProps {
  ujian: any
  onStatusChange?: () => void
}

export function UjianStatusCard({ ujian, onStatusChange }: UjianStatusCardProps) {
  const startUjianMutation = useStartUjian()
  const completeUjianMutation = useCompleteUjian()

  const handleStart = async () => {
    try {
      await startUjianMutation.mutateAsync(ujian.id)
      toast.success(`Ujian "${ujian.name}" berhasil dimulai!`)
      onStatusChange?.()
    } catch (error) {
      toast.error('Gagal memulai ujian')
    }
  }

  const handleComplete = async () => {
    const confirm = window.confirm(
      `Yakin ingin mengakhiri ujian "${ujian.name}"?\n\nSetelah diakhiri, siswa tidak bisa lagi mengerjakan ujian ini.`
    )
    
    if (!confirm) return

    try {
      await completeUjianMutation.mutateAsync(ujian.id)
      toast.success(`Ujian "${ujian.name}" berhasil diakhiri!`)
      onStatusChange?.()
    } catch (error) {
      toast.error('Gagal mengakhiri ujian')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'active':
        return <Badge variant="default" className="bg-green-500">Aktif</Badge>
      case 'completed':
        return <Badge variant="destructive">Selesai</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTimeInfo = () => {
    if (!ujian.start_time) return null

    const startTime = new Date(ujian.start_time)
    const endTime = ujian.end_time ? new Date(ujian.end_time) : null
    const now = new Date()

    if (ujian.status === 'active' && endTime) {
      const timeLeft = Math.max(0, endTime.getTime() - now.getTime())
      const isExpired = timeLeft <= 0

      return (
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-4 w-4" />
            <span>
              Dimulai: {format(startTime, 'PPp', { locale: id })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className={isExpired ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
              {isExpired 
                ? `Berakhir ${formatDistanceToNow(endTime, { addSuffix: true, locale: id })}`
                : `Berakhir ${formatDistanceToNow(endTime, { addSuffix: true, locale: id })}`
              }
            </span>
          </div>
          {isExpired && (
            <div className="text-red-600 dark:text-red-400 font-medium mt-1">
              ⚠️ Ujian sudah berakhir - pertimbangkan untuk mengakhiri
            </div>
          )}
        </div>
      )
    }

    if (ujian.status === 'completed' && ujian.updated_at) {
      return (
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              Diakhiri: {format(new Date(ujian.updated_at), 'PPp', { locale: id })}
            </span>
          </div>
        </div>
      )
    }

    return null
  }

  const canStart = ujian.status === 'draft' && (ujian.ujian_soal?.length > 0)
  const canComplete = ujian.status === 'active'
  const isExpired = ujian.status === 'active' && ujian.end_time && new Date() > new Date(ujian.end_time)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {ujian.name}
              {getStatusBadge(ujian.status)}
              {isExpired && <Badge variant="destructive">Expired</Badge>}
            </CardTitle>
            <CardDescription>
              {ujian.description || 'Tidak ada deskripsi'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ujian Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>{ujian.ujian_soal?.length || 0} Soal</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{ujian.duration_minutes} Menit</span>
          </div>
        </div>

        {/* Time Info */}
        {getTimeInfo()}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {ujian.status === 'draft' && (
            <Button 
              onClick={handleStart}
              disabled={!canStart || startUjianMutation.isPending}
              size="sm"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {startUjianMutation.isPending ? 'Memulai...' : 'Mulai Ujian'}
            </Button>
          )}

          {ujian.status === 'active' && (
            <Button 
              onClick={handleComplete}
              disabled={completeUjianMutation.isPending}
              variant={isExpired ? "destructive" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              {completeUjianMutation.isPending ? 'Mengakhiri...' : 'Akhiri Ujian'}
            </Button>
          )}

          {!canStart && ujian.status === 'draft' && (
            <div className="text-sm text-muted-foreground">
              Tambahkan minimal 1 soal untuk memulai ujian
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
