'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'

// Routes yang sering dikunjungi guru
const GURU_ROUTES = [
  '/guru/dashboard',
  '/guru/kelas',
  '/guru/ujian',
  '/guru/hasil',
  '/guru/soal'
]

// Routes yang sering dikunjungi siswa
const SISWA_ROUTES = [
  '/siswa/dashboard',
  '/siswa/kelas',
  '/siswa/ujian'
]

interface PreloadOptions {
  delay?: number
  priority?: 'high' | 'low'
  userRole?: 'guru' | 'siswa'
}

/**
 * Hook untuk preload navigasi yang akan mempercepat perpindahan halaman
 */
export function usePreloadNavigation({ 
  delay = 2000, 
  priority = 'low',
  userRole 
}: PreloadOptions = {}) {
  const router = useRouter()

  // Preload specific route
  const preloadRoute = useCallback((route: string) => {
    router.prefetch(route)
  }, [router])

  // Preload semua routes berdasarkan role
  const preloadAllRoutes = useCallback(() => {
    const routes = userRole === 'guru' ? GURU_ROUTES : 
                   userRole === 'siswa' ? SISWA_ROUTES : 
                   [...GURU_ROUTES, ...SISWA_ROUTES]

    routes.forEach(route => {
      setTimeout(() => {
        router.prefetch(route)
      }, Math.random() * delay) // Stagger preloading
    })
  }, [router, delay, userRole])

  // Auto preload on mount untuk improved UX
  useEffect(() => {
    if (priority === 'high') {
      // Immediate preload untuk priority tinggi
      preloadAllRoutes()
    } else {
      // Delayed preload untuk priority rendah
      const timer = setTimeout(preloadAllRoutes, delay)
      return () => clearTimeout(timer)
    }
  }, [preloadAllRoutes, priority, delay])

  return {
    preloadRoute,
    preloadAllRoutes,
    preloadGuruRoutes: () => GURU_ROUTES.forEach(route => router.prefetch(route)),
    preloadSiswaRoutes: () => SISWA_ROUTES.forEach(route => router.prefetch(route))
  }
}

/**
 * Hook untuk preload navigation dengan hover detection
 */
export function useHoverPreload() {
  const router = useRouter()

  const preloadOnHover = useCallback((route: string) => {
    return {
      onMouseEnter: () => router.prefetch(route),
      onTouchStart: () => router.prefetch(route), // Mobile support
    }
  }, [router])

  return { preloadOnHover }
}

/**
 * Hook untuk smooth navigation dengan loading state management
 */
export function useSmoothNavigation() {
  const router = useRouter()

  const navigateSmooth = useCallback((route: string, options?: { 
    preload?: boolean 
    replace?: boolean 
  }) => {
    const { preload = true, replace = false } = options || {}

    if (preload) {
      router.prefetch(route)
    }

    // Small delay to ensure prefetch starts
    setTimeout(() => {
      if (replace) {
        router.replace(route)
      } else {
        router.push(route)
      }
    }, 50)
  }, [router])

  return { navigateSmooth }
}