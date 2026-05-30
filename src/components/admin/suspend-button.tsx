'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toastSuccess, toastError } from '@/lib/toast'
import { toggleSuspendAction } from '@/app/admin/users/actions'

interface SuspendButtonProps {
  userId: string
  isSuspended: boolean
  isOwnAccount: boolean
}

export function SuspendButton({ userId, isSuspended, isOwnAccount }: SuspendButtonProps) {
  const [suspended, setSuspended] = useState(isSuspended)
  const [isPending, startTransition] = useTransition()

  if (isOwnAccount) {
    return null
  }

  function handleToggleSuspend(formData: FormData) {
    startTransition(async () => {
      const result = await toggleSuspendAction(formData)
      if (result.success) {
        toastSuccess('Berhasil', result.message)
        setSuspended(!suspended)
      } else {
        toastError('Gagal', result.message)
      }
    })
  }

  return (
    <form action={handleToggleSuspend}>
      <input type="hidden" name="user_id" value={userId} />
      <Button
        type="submit"
        variant={suspended ? 'secondary' : 'destructive'}
        size="sm"
        disabled={isPending}
      >
        {isPending ? '...' : suspended ? 'Aktifkan' : 'Suspend'}
      </Button>
    </form>
  )
}
