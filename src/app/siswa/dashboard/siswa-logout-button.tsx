'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { LogOut, Loader2 } from 'lucide-react'

export default function SiswaLogoutButton() {
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      // Tambahkan delay minimal agar modal terlihat
      await Promise.all([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (_error: unknown) {
      // Jika ada error, tetap redirect ke login
      window.location.href = '/login'
    } finally {
      // Note: setIsLoggingOut(false) tidak diperlukan karena halaman akan redirect
    }
  }

  return (
    <>
      <DropdownMenuItem 
        onClick={handleLogout}
        className="text-red-600 focus:text-red-600 cursor-pointer"
        disabled={isLoggingOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Keluar
      </DropdownMenuItem>

      {/* Modal Loading saat Logout */}
      <Dialog open={isLoggingOut} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md"
          showCloseButton={false}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-brand-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sedang Keluar...
            </h3>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
