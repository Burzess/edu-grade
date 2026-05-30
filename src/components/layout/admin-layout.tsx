'use client'

import { useState } from 'react'
import { AdminSidebar, MobileAdminSidebar } from '@/components/sidebar/admin-sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { AdminOnlyGuard } from '@/components/auth/role-guard'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  return (
    <AdminOnlyGuard>
      <div className="flex h-screen bg-background">
        <div className="hidden lg:flex lg:flex-shrink-0">
          <AdminSidebar />
        </div>

        <MobileAdminSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
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
                <h1 className="text-lg font-semibold text-foreground">Edu-Grade</h1>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminOnlyGuard>
  )
}

export default AdminLayout
