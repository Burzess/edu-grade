'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Helper untuk mendapatkan valid access token
async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

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
  
  const supabase = createClient()

  useEffect(() => {
    fetchKelasList()
  }, [])

  const fetchKelasList = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Validasi user terlebih dahulu, lalu ambil token
      const accessToken = await getValidAccessToken(supabase)
      if (!accessToken) {
        setError('Session tidak valid atau expired')
        return
      }

      const response = await fetch('/api/kelas/list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
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
    } catch (error) {
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
                <CardDescription>
                  <Badge variant="outline" className="w-fit">
                    {selectedKelas.kode_kelas}
                  </Badge>
                </CardDescription>
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

export default KelasSelector