'use client'

import { useState, useRef, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from "@/components/ui/button"
import { AlertCircle, User, ChevronsUpDown, Search, X, Check } from 'lucide-react'
import { useAdminUsers } from '@/hooks/use-admin'
import { cn } from "@/lib/utils"

interface GuruSelectorProps {
  value?: string | null
  onValueChange: (guruId: string | null) => void
  placeholder?: string
}

export function GuruSelector({ 
  value, 
  onValueChange, 
  placeholder = "Pilih guru..."
}: GuruSelectorProps) {
  const { data: usersResponse, isLoading, error, refetch } = useAdminUsers({ role: 'guru', limit: 100 })
  const guruList = usersResponse?.data || []
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) setSearchQuery('')
  }, [isOpen])

  const getSelectedGuruName = () => {
    if (!value) return null
    const guru = guruList.find(k => k.id === value)
    return guru ? guru.full_name : null
  }

  const filteredGuruList = guruList.filter(guru => {
    const q = searchQuery.toLowerCase()
    return guru.full_name?.toLowerCase().includes(q) || guru.email?.toLowerCase().includes(q)
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 border border-destructive/20 rounded-md bg-destructive/5 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Gagal mengambil data guru</span>
        <button onClick={() => refetch()} className="underline ml-auto">Coba Lagi</button>
      </div>
    )
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between font-normal min-h-[40px] h-auto py-2 px-3 bg-background hover:bg-accent/50"
      >
        <div className="flex items-center gap-2 w-full min-w-0 mr-2">
          {value && value !== 'none' ? (
            <>
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate flex-1 text-left" title={getSelectedGuruName() || undefined}>
                {getSelectedGuruName() || 'Guru Tidak Ditemukan'}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground truncate flex-1 text-left">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-[280px] rounded-md border bg-popover text-popover-foreground shadow-md flex flex-col overflow-hidden">
          <div className="p-2 border-b bg-muted/30 sticky top-0 z-10 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari nama atau email guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[230px] p-1 space-y-1">
            <div
              onClick={() => {
                onValueChange(null)
                setIsOpen(false)
              }}
              className={cn(
                "flex items-center gap-2 p-2 rounded-sm cursor-pointer text-sm transition-colors",
                !value || value === 'none' ? "bg-accent/80 font-medium text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              )}
            >
              <div className="w-4 h-4 rounded-full border border-muted-foreground/30 shrink-0 flex items-center justify-center">
                {(!value || value === 'none') && <Check className="h-3 w-3 text-primary" />}
              </div>
              <span className="italic">Tidak Ada Guru Terpilih</span>
            </div>

            {filteredGuruList.map((guru) => {
              const isSelected = value === guru.id
              return (
                <div
                  key={guru.id}
                  onClick={() => {
                    onValueChange(guru.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-sm cursor-pointer text-sm transition-colors",
                    isSelected ? "bg-accent font-medium text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                    <User className={cn("h-4 w-4 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate" title={guru.full_name}>
                      {guru.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">{guru.email}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary ml-1 shrink-0" />}
                  </div>
                </div>
              )
            })}

            {filteredGuruList.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Guru tidak ditemukan.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GuruSelector
