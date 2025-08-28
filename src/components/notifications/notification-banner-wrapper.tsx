'use client'

import { useState, useEffect } from 'react'
import { NotificationBanner } from '@/components/notifications/notification-banner'

export function NotificationBannerWrapper() {
  const [mounted, setMounted] = useState(false)

  // Only render after component is mounted on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering on server
  if (!mounted) {
    return null
  }

  return <NotificationBanner />
}
