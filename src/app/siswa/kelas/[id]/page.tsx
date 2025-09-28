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
import {
  User,
  ArrowLeft,
  BookOpen,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import SiswaLogoutButton from '../../dashboard/siswa-logout-button'
// @ts-ignore
import SiswaKelasDetailClient from './siswa-kelas-detail-client'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SiswaKelasDetailPage({ params }: PageProps) {
  // Server-side auth check
  const user = await requireSiswa()
  
  // Await params before using its properties
  const { id } = await params

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/siswa/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <div className="border-l pl-4">
                <h1 className="text-lg font-semibold text-foreground">
                  Detail Kelas
                </h1>
              </div>
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
        <div className="px-4 py-6 sm:px-0">
          {/* Client Component untuk data dinamis */}
          <SiswaKelasDetailClient kelasId={id} />
        </div>
      </main>
    </div>
  )
}