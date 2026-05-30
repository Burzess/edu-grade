'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SuspendButton } from '@/components/admin/suspend-button'
import { ResetPasswordModal } from '@/components/admin/reset-password-modal'

interface UserActionButtonsProps {
  userId: string
  isSuspended: boolean
  currentAdminId: string
  userName: string
}

export function UserActionButtons({
  userId,
  isSuspended,
  currentAdminId,
  userName,
}: UserActionButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isOwnAccount = userId === currentAdminId

  return (
    <div className="flex flex-row gap-2">
      <SuspendButton
        userId={userId}
        isSuspended={isSuspended}
        isOwnAccount={isOwnAccount}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={isModalOpen}
      >
        Reset Password
      </Button>
      <ResetPasswordModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={userId}
        userName={userName}
      />
    </div>
  )
}
