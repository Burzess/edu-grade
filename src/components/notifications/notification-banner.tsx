'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useNotifications } from '@/hooks/use-notifications'

interface NotificationBannerProps {
  onDismiss?: () => void
}

export function NotificationBanner({ onDismiss }: NotificationBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { permission, requestPermission, isSupported } = useNotifications()

  // Ensure component is mounted before rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Jangan tampilkan banner jika belum mounted atau notifications tidak didukung atau sudah granted/denied
  if (!mounted || !isSupported || permission !== 'default' || !isVisible) {
    return null
  }

  const handleEnableNotifications = async () => {
    const result = await requestPermission()
    if (result === 'granted') {
      setIsVisible(false)
      onDismiss?.()
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-blue-800">
              Aktifkan Notifikasi
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Dapatkan notifikasi langsung ketika ada ujian baru yang dimulai oleh guru, 
              sehingga Anda tidak perlu refresh halaman.
            </p>
            <div className="mt-3 flex space-x-3">
              <Button 
                size="sm" 
                onClick={handleEnableNotifications}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Aktifkan Notifikasi
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-blue-600 hover:text-blue-700"
              >
                Nanti Saja
              </Button>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-700 h-5 w-5 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
