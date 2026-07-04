'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuthStore } from '@/store/auth'
import { useAuth } from '@/components/providers/auth-provider'
import { usePreloadNavigation, useHoverPreload } from '@/hooks/use-preload-navigation'
import {
  dispatchGuruPreferencesUpdated,
  GURU_PREFERENCES_UPDATED_EVENT,
  loadGuruPreferences,
  updateGuruPreferences,
} from '@/lib/guru-preferences'
import {
  BookOpen,
  BarChart3,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Trophy,
  User,
  Loader2
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
    href: '/guru/dashboard',
    icon: Home,
    description: 'Halaman utama guru'
  },
  {
    name: 'Daftar Ujian',
    href: '/guru/ujian',
    icon: BookOpen,
    description: 'Kelola soal ujian'
  },
  {
    name: 'Hasil Ujian',
    href: '/guru/hasil',
    icon: BarChart3,
    description: 'Lihat hasil ujian siswa'
  },
  {
    name: 'Kelola Soal',
    href: '/guru/soal',
    icon: FileText,
    description: 'Bank soal'
  }
]

export function GuruSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()
  
  // Preload navigation untuk performa yang lebih baik
  usePreloadNavigation({ 
    userRole: 'guru', 
    priority: 'high', 
    delay: 1000 
  })
  const { preloadOnHover } = useHoverPreload()

  const isActive = (href: string) => {
    if (href === '/guru/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      
      // Tambahkan delay minimal agar modal terlihat
      await Promise.all([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (error: unknown) {
      console.error('Logout error:', error)
      // Jika ada error, tetap redirect ke login
      window.location.href = '/login'
    } finally {
      // Note: setIsLoggingOut(false) tidak diperlukan karena halaman akan redirect
    }
  }

  useEffect(() => {
    const applyPreferences = () => {
      const preferences = loadGuruPreferences()
      setIsCollapsed(preferences.sidebarCompact)
    }

    applyPreferences()

    const handlePreferencesUpdate = () => applyPreferences()
    window.addEventListener(GURU_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate)
    return () => {
      window.removeEventListener(GURU_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate)
    }
  }, [])

  const handleToggleCollapse = () => {
    const nextCollapsed = !isCollapsed
    setIsCollapsed(nextCollapsed)
    updateGuruPreferences({ sidebarCompact: nextCollapsed })
    dispatchGuruPreferencesUpdated()
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shadow-md",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div>
              <img 
              src="/school-of-creativepreneur-768x432.webp"
              alt="Logo"
              className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleCollapse}
          className="p-2"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-sidebar-foreground/70" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.full_name || 'Guru'}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary border-r-2 border-sidebar-primary font-semibold shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={isCollapsed ? item.name : undefined}
              {...preloadOnHover(item.href)}
            >
              <Icon className={cn(
                "flex-shrink-0",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
                isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
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

      {/* Bottom Section */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        
        <Link
          href="/guru/settings"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            pathname === '/guru/settings'
              ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          title={isCollapsed ? 'Pengaturan' : undefined}
        >
          <Settings className={cn(
            "flex-shrink-0 h-5 w-5",
            pathname === '/guru/settings' ? "text-sidebar-primary" : "text-sidebar-foreground/70",
            !isCollapsed && "mr-3"
          )} />
          {!isCollapsed && <span>Pengaturan</span>}
        </Link>

        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "w-full justify-start px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            !isCollapsed && "space-x-3"
          )}
          title={isCollapsed ? 'Keluar' : undefined}
        >
          <LogOut className="flex-shrink-0 h-5 w-5 text-sidebar-foreground/70" />
          {!isCollapsed && <span>Keluar</span>}
        </Button>
      </div>

      {/* Modal Loading saat Logout */}
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

// Mobile Sidebar Overlay Component
export function MobileGuruSidebar({ 
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
    if (href === '/guru/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      onClose() // Tutup mobile sidebar
      
      // Tambahkan delay minimal agar modal terlihat
      await Promise.all([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 800))
      ])
    } catch (error: unknown) {
      console.error('Logout error:', error)
      // Jika ada error, tetap redirect ke login
      window.location.href = '/login'
    } finally {
      // Note: setIsLoggingOut(false) tidak diperlukan karena halaman akan redirect
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border z-50 lg:hidden shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">Edu-Grade</h1>
                <p className="text-xs text-sidebar-foreground/70">Panel Guru</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Profile Section */}
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sidebar-accent rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-sidebar-foreground/70" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {profile?.full_name || 'Guru'}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
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
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary border-r-2 border-sidebar-primary font-semibold shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className={cn(
                    "flex-shrink-0 h-5 w-5 mr-3",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/70"
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

          {/* Bottom Section */}
          <div className="p-2 border-t border-sidebar-border space-y-1">

            <Link
              href="/guru/settings"
              onClick={onClose}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === '/guru/settings'
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Settings className={cn(
                "flex-shrink-0 h-5 w-5 mr-3",
                pathname === '/guru/settings' ? "text-sidebar-primary" : "text-sidebar-foreground/70"
              )} />
              <span>Pengaturan</span>
            </Link>

            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full justify-start px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="flex-shrink-0 h-5 w-5 mr-3 text-sidebar-foreground/70" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Loading saat Logout untuk Mobile */}
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
