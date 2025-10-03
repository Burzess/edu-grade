'use client'

import { useState, useEffect } from 'react'

interface AuthLoadingProps {
  message?: string
  role?: 'guru' | 'siswa' | null
}

// Komponen AuthLoading yang sangat minimal untuk menghindari blank page
export function AuthLoading() {
  return null
}

// Komponen loading minimal untuk inline usage - hanya tampilkan jika benar-benar diperlukan
export function InlineAuthLoading({ message = "Loading..." }: { message?: string }) {
  const [shouldShow, setShouldShow] = useState(false)
  
  useEffect(() => {
    // Hanya tampilkan loading setelah delay untuk menghindari flicker
    const timer = setTimeout(() => setShouldShow(true), 200)
    return () => clearTimeout(timer)
  }, [])
  
  // Untuk navigasi yang cepat, jangan tampilkan loading sama sekali
  if (!shouldShow) return null
  
  // Minimal loading indicator
  return (
    <div className="flex items-center justify-center min-h-[50px] opacity-60">
      <div className="text-sm text-muted-foreground">
        {message}
      </div>
    </div>
  )
}