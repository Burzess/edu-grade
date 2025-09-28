'use client'

import { useState } from 'react'
import { SiswaSidebar, MobileSiswaSidebar } from '@/components/sidebar/siswa-sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { SiswaOnlyGuard } from '@/components/auth/role-guard'

interface SiswaLayoutProps {
  children: React.ReactNode
}

export function SiswaLayout({ children }: SiswaLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <SiswaOnlyGuard>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <SiswaSidebar />
        </div>

        {/* Mobile Sidebar */}
        <MobileSiswaSidebar 
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden bg-card border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="p-2"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold text-foreground">
                  Edu-Grade
                </h1>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SiswaOnlyGuard>
  )
}