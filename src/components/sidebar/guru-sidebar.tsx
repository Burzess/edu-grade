'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { useAuth } from '@/components/providers/auth-provider'
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
  User
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
    name: 'Kelola Ujian',
    href: '/guru/ujian',
    icon: BookOpen,
    description: 'Daftar semua ujian'
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
  },
  {
    name: 'Siswa',
    href: '/guru/siswa',
    icon: Users,
    description: 'Daftar siswa'
  }
]

export function GuruSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()

  const isActive = (href: string) => {
    if (href === '/guru/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Edu-Grade</h1>
              <p className="text-xs text-gray-500">Panel Guru</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'Guru'}
              </p>
              <p className="text-xs text-gray-500 truncate">
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
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={cn(
                "flex-shrink-0",
                active ? "text-blue-700" : "text-gray-400",
                isCollapsed ? "h-5 w-5" : "h-5 w-5 mr-3"
              )} />
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate">{item.name}</div>
                  {item.description && (
                    <div className="text-xs text-gray-400 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              )}
              {active && !isCollapsed && (
                <div className="w-1 h-1 bg-blue-700 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-2 border-t border-gray-200 space-y-1">
        <Link
          href="/guru/settings"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
            pathname === '/guru/settings'
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
          title={isCollapsed ? 'Pengaturan' : undefined}
        >
          <Settings className={cn(
            "flex-shrink-0 h-5 w-5",
            pathname === '/guru/settings' ? "text-blue-700" : "text-gray-400",
            !isCollapsed && "mr-3"
          )} />
          {!isCollapsed && <span>Pengaturan</span>}
        </Link>

        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            !isCollapsed && "space-x-3"
          )}
          title={isCollapsed ? 'Keluar' : undefined}
        >
          <LogOut className="flex-shrink-0 h-5 w-5 text-gray-400" />
          {!isCollapsed && <span>Keluar</span>}
        </Button>
      </div>
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
  const pathname = usePathname()
  const { profile } = useAuthStore()
  const { signOut } = useAuth()

  const isActive = (href: string) => {
    if (href === '/guru/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
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
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 lg:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Edu-Grade</h1>
                <p className="text-xs text-gray-500">Panel Guru</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Profile Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-gray-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || 'Guru'}
                </p>
                <p className="text-xs text-gray-500 truncate">
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
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn(
                    "flex-shrink-0 h-5 w-5 mr-3",
                    active ? "text-blue-700" : "text-gray-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-400 truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {active && (
                    <div className="w-1 h-1 bg-blue-700 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-2 border-t border-gray-200 space-y-1">
            <Link
              href="/guru/settings"
              onClick={onClose}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === '/guru/settings'
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Settings className={cn(
                "flex-shrink-0 h-5 w-5 mr-3",
                pathname === '/guru/settings' ? "text-blue-700" : "text-gray-400"
              )} />
              <span>Pengaturan</span>
            </Link>

            <Button
              variant="ghost"
              onClick={() => {
                onClose()
                signOut()
              }}
              className="w-full justify-start px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="flex-shrink-0 h-5 w-5 mr-3 text-gray-400" />
              <span>Keluar</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
