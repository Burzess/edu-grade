'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  School,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronsUpDown,
  Search,
  X
} from 'lucide-react'
import { cn } from "@/lib/utils"

interface Kelas {
  id: string
  nama_kelas: string
  kode_kelas: string
  member_count: number
  created_at: string
}

interface KelasSelectorProps {
  value?: string | null
  onValueChange: (kelasId: string | null) => void
  placeholder?: string
  allowNone?: boolean
  showDetails?: boolean
}

export function KelasSelector({ 
  value, 
  onValueChange, 
  placeholder = "Pilih kelas...",
  allowNone = true,
  showDetails = false
}: KelasSelectorProps) {
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedKelas, setSelectedKelas] = useState<Kelas | null>(null)

  useEffect(() => {
    fetchKelasList()
  }, [])

  const fetchKelasList = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // SSR cookies handle authentication for same-origin calls
      const response = await fetch('/api/kelas/list', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil daftar kelas')
      }

      const result = await response.json()
      if (result.success) {
        setKelasList(result.data || [])
      } else {
        setError(result.error || 'Gagal mengambil daftar kelas')
      }
    } catch (error: unknown) {
      console.error('Error fetching kelas list:', error)
      setError('Terjadi kesalahan saat mengambil daftar kelas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleValueChange = (kelasId: string) => {
    if (kelasId === 'none') {
      onValueChange(null)
    } else {
      onValueChange(kelasId)
    }
  }

  const getSelectedKelasName = () => {
    if (!value) return null
    const kelas = kelasList.find(k => k.id === value)
    return kelas ? kelas.nama_kelas : null
  }

  const handleShowDetails = (kelas: Kelas) => {
    setSelectedKelas(kelas)
    setShowDetailsDialog(true)
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
      <div className="flex items-center gap-2 p-4 border border-destructive/20 rounded-md bg-destructive/5">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchKelasList}
          className="ml-auto"
        >
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <>
      <Select 
        value={value || 'none'} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full min-w-0">
          <div className="flex items-center gap-2 w-full min-w-0">
            {value && value !== 'none' ? (
              <>
                <School className="h-4 w-4 text-primary flex-shrink-0" />
                <span 
                  className="truncate flex-1" 
                  title={getSelectedKelasName() || undefined}
                >
                  {getSelectedKelasName()}
                </span>
              </>
            ) : value === 'none' ? (
              <>
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                <span className="truncate flex-1">Ujian Global</span>
              </>
            ) : (
              <span className="text-muted-foreground truncate flex-1">{placeholder}</span>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className="min-w-[300px]">
          {allowNone && (
            <SelectItem value="none">
              <div className="flex items-center gap-2 w-full min-w-0">
                <div className="w-4 h-4 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                <span className="truncate flex-1">Ujian Global</span>
              </div>
            </SelectItem>
          )}
          {kelasList.map((kelas) => (
            <SelectItem key={kelas.id} value={kelas.id}>
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <School className="h-4 w-4 text-primary flex-shrink-0" />
                  <span 
                    className="font-medium truncate" 
                    title={kelas.nama_kelas}
                  >
                    {kelas.nama_kelas}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{kelas.member_count}</span>
                  {showDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleShowDetails(kelas)
                      }}
                      className="h-6 w-6 p-0 ml-1"
                    >
                      ℹ️
                    </Button>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {kelasList.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <School className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada kelas</p>
          <p className="text-xs">Buat kelas terlebih dahulu untuk menambah ujian</p>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Detail Kelas
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang kelas yang dipilih
            </DialogDescription>
          </DialogHeader>
          
          {selectedKelas && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selectedKelas.nama_kelas}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedKelas.member_count} siswa
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      Dibuat {new Date(selectedKelas.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Quick selector untuk form yang sederhana
export function SimpleKelasSelector({ value, onValueChange, placeholder, allowNone = true }: KelasSelectorProps) {
  return (
    <KelasSelector
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      allowNone={allowNone}
      showDetails={false}
    />
  )
}

export function MultiKelasSelector({ 
  value = [], 
  onValueChange 
}: { 
  value?: string[], 
  onValueChange: (val: string[]) => void 
}) {
  const [kelasList, setKelasList] = useState<Kelas[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

  useEffect(() => {
    fetchKelasList()
  }, [])

  const fetchKelasList = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/kelas/list', { credentials: 'include' })
      if (!response.ok) throw new Error('Gagal')
      const result = await response.json()
      if (result.success) setKelasList(result.data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredKelasList = kelasList.filter(k => {
    const q = searchQuery.toLowerCase()
    return k.nama_kelas?.toLowerCase().includes(q)
  })

  if (isLoading) return <Skeleton className="h-10 w-full" />

  return (
    <div className="relative w-full" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between font-normal min-h-[40px] h-auto py-2 px-3 bg-background hover:bg-accent/50"
      >
        <div className="flex flex-wrap gap-1.5 items-center text-left flex-1 min-w-0 mr-2">
          {value.length === 0 ? (
            <span className="text-muted-foreground">Pilih kelas target (opsional / global)...</span>
          ) : (
            <>
              {kelasList
                .filter(k => value.includes(k.id))
                .slice(0, 3)
                .map(k => (
                  <Badge 
                    key={k.id} 
                    variant="secondary" 
                    className="text-xs font-normal px-2 py-0.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onValueChange(value.filter(id => id !== k.id))
                    }}
                  >
                    {k.nama_kelas}
                    <span className="ml-1 text-muted-foreground hover:text-foreground">×</span>
                  </Badge>
                ))}
              {value.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{value.length - 3} lainnya
                </Badge>
              )}
            </>
          )}
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-[300px] rounded-md border bg-popover text-popover-foreground shadow-md flex flex-col overflow-hidden">
          <div className="p-2 border-b bg-muted/30 sticky top-0 z-10 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cari kelas atau kode..."
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
          
          {kelasList.length > 0 && (
            <div className="flex items-center justify-between py-1.5 px-3 border-b bg-muted/10 text-xs text-muted-foreground">
              <span>{value.length} dari {kelasList.length} terpilih</span>
              <div className="space-x-3 font-medium">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onValueChange(kelasList.map(k => k.id))
                  }}
                  className="hover:underline text-primary"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onValueChange([])
                  }}
                  className="hover:underline text-destructive"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-[220px] p-1 space-y-1">
            {filteredKelasList.map(kelas => {
              const isChecked = value.includes(kelas.id)
              return (
                <label 
                  key={kelas.id} 
                  htmlFor={`kelas-${kelas.id}`}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-sm cursor-pointer transition-colors w-full",
                    isChecked ? "bg-accent/60" : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Checkbox 
                    id={`kelas-${kelas.id}`} 
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onValueChange([...value, kelas.id])
                      } else {
                        onValueChange(value.filter(id => id !== kelas.id))
                      }
                    }}
                  />
                  <span className="text-sm font-medium leading-none flex-1">
                    {kelas.nama_kelas}
                  </span>
                </label>
              )
            })}
            {filteredKelasList.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Kelas tidak ditemukan.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default KelasSelector