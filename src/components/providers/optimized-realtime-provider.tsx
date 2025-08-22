import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { OptimizedRealtimeManager } from '@/hooks/use-optimized-jawaban'

// Smart component untuk mengatur realtime subscriptions
export function OptimizedRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user?.id) return

    console.log('🚀 Initializing optimized realtime provider for user:', user.id)
    
    const manager = OptimizedRealtimeManager.getInstance()

    const handleUjianChange = (payload: any) => {
      console.log('📡 Optimized ujian change received:', payload.eventType)
      
      // Throttled invalidation to prevent spam
      const throttleKey = 'ujian-invalidation'
      if (!sessionStorage.getItem(throttleKey)) {
        sessionStorage.setItem(throttleKey, Date.now().toString())
        
        setTimeout(() => {
          sessionStorage.removeItem(throttleKey)
        }, 2000) // 2 seconds throttle
        
        // Smart invalidation - only relevant queries
        queryClient.invalidateQueries({ 
          queryKey: ['ujian'], 
          exact: false,
          refetchType: 'none' // Don't trigger immediate refetch
        })
        
        // Schedule a single refetch after throttle period
        setTimeout(() => {
          queryClient.refetchQueries({ 
            queryKey: ['ujian', 'available', user.id],
            exact: false
          })
        }, 3000)
      }
    }

    const cleanup = manager.subscribeToUjianChanges(user.id, handleUjianChange)

    return () => {
      console.log('🧹 Cleaning up optimized realtime provider')
      cleanup()
    }
  }, [user?.id, queryClient])

  return <>{children}</>
}

// Hook untuk connection state monitoring
export function useConnectionHealth() {
  useEffect(() => {
    let connectionCheckInterval: NodeJS.Timeout

    const checkConnection = () => {
      if (!navigator.onLine) {
        console.warn('⚠️ Connection offline - pausing realtime subscriptions')
        OptimizedRealtimeManager.getInstance().cleanup()
      }
    }

    const handleOnline = () => {
      console.log('✅ Connection restored - reinitializing realtime subscriptions')
      // Allow some time for connection to stabilize
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    }

    const handleOffline = () => {
      console.warn('⚠️ Connection lost')
      OptimizedRealtimeManager.getInstance().cleanup()
    }

    // Check connection health every 30 seconds
    connectionCheckInterval = setInterval(checkConnection, 30000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(connectionCheckInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          
          if (nav.loadEventEnd - nav.fetchStart > 10000) { // > 10 seconds
            console.warn('🐌 Slow page load detected:', {
              total: Math.round(nav.loadEventEnd - nav.fetchStart),
              dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
              connection: Math.round(nav.connectEnd - nav.connectStart),
              request: Math.round(nav.responseStart - nav.requestStart),
              response: Math.round(nav.responseEnd - nav.responseStart),
              dom: Math.round(nav.domContentLoadedEventEnd - nav.responseEnd)
            })
            
            // Suggest optimizations
            console.info('💡 Performance suggestions:')
            console.info('- Check network connection')
            console.info('- Consider reducing polling intervals')
            console.info('- Check for memory leaks')
          }
        }
      })
    })

    observer.observe({ entryTypes: ['navigation', 'resource'] })

    return () => observer.disconnect()
  }, [])

  // Memory usage monitoring
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1048576)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1048576)
        
        if (usedMB > limitMB * 0.8) { // > 80% memory usage
          console.warn('⚠️ High memory usage detected:', {
            used: `${usedMB}MB`,
            limit: `${limitMB}MB`,
            percentage: Math.round((usedMB / limitMB) * 100) + '%'
          })
          
          // Suggest cleanup
          console.info('💡 Consider clearing cache or reloading page')
        }
      }
    }

    const memoryInterval = setInterval(checkMemory, 60000) // Check every minute
    return () => clearInterval(memoryInterval)
  }, [])
}
