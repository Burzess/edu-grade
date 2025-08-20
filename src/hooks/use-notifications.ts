import { useEffect, useState } from 'react'

// Hook untuk mengelola browser notifications
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Request notification permission dari user
  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission()
        setPermission(result)
        return result
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        return 'denied'
      }
    }
    return 'denied'
  }

  // Show notification
  const showNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window !== 'undefined' && 'Notification' in window && permission === 'granted') {
      return new Notification(title, options)
    }
    return null
  }

  // Show notification untuk ujian baru
  const showUjianNotification = (ujianName: string) => {
    return showNotification('Ujian Baru Tersedia!', {
      body: `Ujian "${ujianName}" telah dimulai dan siap dikerjakan`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `ujian-${ujianName}`,
      requireInteraction: true, // Notification tidak hilang otomatis
    })
  }

  return {
    permission,
    requestPermission,
    showNotification,
    showUjianNotification,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  }
}
