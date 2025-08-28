import Link from 'next/link'
import { requireSiswa } from '@/lib/auth-server'
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationBannerWrapper } from '@/components/notifications/notification-banner-wrapper'
import {
  User,
  LogOut,
} from 'lucide-react'
import SiswaDashboardClient from './siswa-dashboard-client'

export default async function SiswaDashboard() {
  // Server-side auth check - tidak ada loading state
  const user = await requireSiswa()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Edu-Grade - Dashboard Siswa
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.full_name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="text-red-600 focus:text-red-600">
                    <Link href="/api/auth/logout" prefetch={false}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Keluar
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">
              Selamat datang, {user.full_name}!
            </h2>
            <p className="text-blue-100">
              Ikuti ujian yang tersedia dan pantau perkembangan belajar Anda
            </p>
          </div>

          {/* Notification Banner */}
          <NotificationBannerWrapper />

          {/* Client Component untuk data dinamis */}
          <SiswaDashboardClient />
        </div>
      </main>
    </div>
  )
}
