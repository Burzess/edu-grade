'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuthStore } from '@/store/auth'
import { useAuth } from '@/components/providers/auth-provider'
import { usePreloadNavigation, useHoverPreload } from '@/hooks/use-preload-navigation'
import {
  Activity,
  Home,
  LogOut,
  Menu,
  Shield,
  User,
  Users,
  X,
  Loader2,
  BookOpen,
  GraduationCap
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ElementType
  description?: string
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: Home,
    description: 'Ringkasan sistem'
  },
  {
    name: 'Kelola Akun',
    href: '/admin/users',
    icon: Users,
    description: 'Akun guru dan siswa'
  },
  {
    name: 'Kelola Kelas',
    href: '/admin/kelas',
    icon: GraduationCap,
    description: 'Kelola kelas dan siswa'
  },
  {
    name: 'Kelola Ujian',
    href: '/admin/ujian',
    icon: BookOpen,
    description: 'Manajemen jadwal ujian'
  },
  {
    name: 'Monitoring Ujian',
    href: '/admin/monitoring',
    icon: Activity,
    description: 'Pantau pelanggaran ujian'
  }
]

export function AdminSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()

  usePreloadNavigation({
    userRole: 'admin',
    priority: 'high',
    delay: 1000
  })
  const { preloadOnHover } = useHoverPreload()

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)

      await Promise.all([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (_error: unknown) {
      window.location.href = '/login'
    }
  }

  return (
    <div className={cn(
      'flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shadow-md',
      isCollapsed ? 'w-16' : 'w-64',
      className
    )}>
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Edu-Grade</h1>
              <p className="text-xs text-sidebar-foreground/80">Panel Admin</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-sidebar-foreground/70" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                active
                  ? 'bg-sidebar-primary/15 text-sidebar-primary border-r-2 border-sidebar-primary font-semibold shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              title={isCollapsed ? item.name : undefined}
              {...preloadOnHover(item.href)}
            >
              <Icon className={cn(
                'flex-shrink-0',
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70',
                isCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'
              )} />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-sidebar-foreground/60 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              )}
              {active && !isCollapsed && (
                <div className="w-1 h-1 bg-sidebar-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            'group w-full justify-start px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors',
            !isCollapsed && 'space-x-3'
          )}
          title={isCollapsed ? 'Keluar' : undefined}
        >
          <LogOut className="flex-shrink-0 h-5 w-5 text-sidebar-foreground/70 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
          {!isCollapsed && <span>Keluar</span>}
        </Button>
      </div>

      <Dialog open={isLoggingOut} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sedang Keluar...
            </h3>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function MobileAdminSidebar({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      onClose()

      await Promise.all([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (_error: unknown) {
      window.location.href = '/login'
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 lg:hidden shadow-xl">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">Edu-Grade</h1>
                <p className="text-xs text-sidebar-foreground/80">Panel Admin</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-sidebar-foreground/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    active
                      ? 'bg-sidebar-primary/15 text-sidebar-primary border-r-2 border-sidebar-primary font-semibold shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className={cn(
                    'flex-shrink-0 h-5 w-5 mr-3',
                    active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-sidebar-foreground/60 truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {active && (
                    <div className="w-1 h-1 bg-sidebar-primary rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="p-2 border-t border-sidebar-border space-y-1">
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group w-full justify-start px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-red-500/10 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="flex-shrink-0 h-5 w-5 mr-3 text-sidebar-foreground/70 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isLoggingOut} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={false}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Sedang Keluar...
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Mohon tunggu, kami sedang mengeluarkan Anda dari sistem dengan aman.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
