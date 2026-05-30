'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toastSuccess, toastError } from '@/lib/toast'

/**
 * Client component yang membaca searchParams status/message,
 * menampilkan toast, lalu membersihkan URL query params.
 */
export function AdminToastHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const status = searchParams.get('status')
  const message = searchParams.get('message')

  useEffect(() => {
    if (!status || !message) return

    const decoded = decodeURIComponent(message)

    if (status === 'success') {
      toastSuccess('Berhasil', decoded)
    } else if (status === 'error') {
      toastError('Gagal', decoded)
    }

    // Bersihkan query params dari URL tanpa reload
    const url = new URL(window.location.href)
    url.searchParams.delete('status')
    url.searchParams.delete('message')
    router.replace(url.pathname, { scroll: false })
  }, [status, message, router])

  return null
}
