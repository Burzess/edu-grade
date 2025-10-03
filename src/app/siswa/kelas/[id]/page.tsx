'use client'

import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AuthGuard } from '@/components/auth/auth-guards'
import { useMiddlewareAuth } from '@/hooks/use-middleware-auth'
import {
  User,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import SiswaLogoutButton from '../../dashboard/siswa-logout-button'
import SiswaKelasDetailClient from './siswa-kelas-detail-client'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function SiswaKelasDetailPage({ params }: PageProps) {
  const { userEmail } = useMiddlewareAuth()
  const displayName = userEmail?.split('@')[0] || 'Siswa'

  return (
    <AuthGuard requiredRole="siswa" showLoading={false}>
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
                          {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userEmail}
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
            <SiswaKelasDetailClientWrapper params={params} />
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}

// Wrapper component untuk handle async params
function SiswaKelasDetailClientWrapper({ params }: { params: Promise<{ id: string }> }) {
  const [kelasId, setKelasId] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    params.then(({ id }) => setKelasId(id))
  }, [params])
  
  if (!kelasId) return <div>Loading...</div>
  
  return <SiswaKelasDetailClient kelasId={kelasId} />
}

// Import React untuk useState/useEffect
import React from 'react'