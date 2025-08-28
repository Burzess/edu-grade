'use client'

import { useAuth } from '@/components/providers/auth-provider'
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogOut } from 'lucide-react'

export default function SiswaLogoutButton() {
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // Jika ada error, tetap redirect ke login
      window.location.href = '/login'
    }
  }

  return (
    <DropdownMenuItem 
      onClick={handleLogout}
      className="text-red-600 focus:text-red-600 cursor-pointer"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Keluar
    </DropdownMenuItem>
  )
}
