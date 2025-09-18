import Link from 'next/link'
import { requireSiswa } from '@/lib/auth-server'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import SiswaLogoutButton from './siswa-logout-button'

export default async function SiswaDashboard() {
  // Server-side auth check - tidak ada loading state
  const user = await requireSiswa()

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-foreground">
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
                  <SiswaLogoutButton />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Welcome Header */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">
                Selamat datang, {user.full_name}!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ikuti ujian yang tersedia dan pantau perkembangan belajar Anda
              </p>
            </CardContent>
          </Card>

          {/* Notification Banner */}
          {/* <NotificationBannerWrapper /> */}

          {/* Client Component untuk data dinamis */}
          <SiswaDashboardClient />
        </div>
      </main>
    </div>
  )
}
