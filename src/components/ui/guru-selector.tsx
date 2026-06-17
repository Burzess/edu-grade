'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, User } from 'lucide-react'
import { useAdminUsers } from '@/hooks/use-admin'

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

  const handleValueChange = (guruId: string) => {
    if (guruId === 'none') {
      onValueChange(null)
    } else {
      onValueChange(guruId)
    }
  }

  const getSelectedGuruName = () => {
    if (!value) return null
    const guru = guruList.find(k => k.id === value)
    return guru ? guru.full_name : null
  }

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
    <Select 
      value={value || 'none'} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full min-w-0">
        <div className="flex items-center gap-2 w-full min-w-0">
          {value && value !== 'none' ? (
            <>
              <User className="h-4 w-4 text-primary flex-shrink-0" />
              <span 
                className="truncate flex-1" 
                title={getSelectedGuruName() || undefined}
              >
                {getSelectedGuruName() || 'Guru Tidak Ditemukan'}
              </span>
            </>
          ) : value === 'none' ? (
            <>
              <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
              <span className="truncate flex-1 text-muted-foreground">{placeholder}</span>
            </>
          ) : (
            <span className="text-muted-foreground truncate flex-1">{placeholder}</span>
          )}
        </div>
      </SelectTrigger>
      <SelectContent className="min-w-[300px]">
        <SelectItem value="none">
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
            <span className="truncate flex-1 italic text-muted-foreground">Tidak Ada Guru Terpilih</span>
          </div>
        </SelectItem>
        {guruList.map((guru) => (
          <SelectItem key={guru.id} value={guru.id}>
            <div className="flex items-center justify-between w-full min-w-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <User className="h-4 w-4 text-primary flex-shrink-0" />
                <span 
                  className="font-medium truncate" 
                  title={guru.full_name}
                >
                  {guru.full_name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                {guru.email}
              </div>
            </div>
          </SelectItem>
        ))}
        {guruList.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Tidak ada guru ditemukan.
          </div>
        )}
      </SelectContent>
    </Select>
  )
}

export default GuruSelector
