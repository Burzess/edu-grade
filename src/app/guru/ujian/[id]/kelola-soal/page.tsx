'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { GuruLayout } from '@/components/layout/guru-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useUjianDetail, useSoalForUjian, useAddSoalToUjian, useRemoveSoalFromUjian } from '@/hooks/use-ujian'
import { Loader2, Plus, Minus, Search, ArrowLeft, Tags, Trash, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function KelolaSoalPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const ujianId = resolvedParams.id

  const { data: ujian, isLoading: isLoadingUjian } = useUjianDetail(ujianId)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Handle Search Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    // Basic debounce implementation
    setTimeout(() => {
      setDebouncedSearch(e.target.value)
    }, 500)
  }

  const { data: soalBankList, isLoading: isLoadingSoal } = useSoalForUjian(debouncedSearch)
  
  const addSoal = useAddSoalToUjian()
  const removeSoal = useRemoveSoalFromUjian()

  // Get array of existing soal IDs in the current exam
  const existingSoalIds: string[] = ujian?.ujian_soal?.map((us: any) => us.soal_id as string) || []
  
  // Local state for pending changes
  const [selectedSoalIds, setSelectedSoalIds] = useState<string[]>([])
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize local state once data is loaded
  if (ujian && !hasInitialized) {
    setSelectedSoalIds(existingSoalIds)
    setHasInitialized(true)
  }

  const handleAddSoal = (soalId: string) => {
    if (!selectedSoalIds.includes(soalId)) {
      setSelectedSoalIds([...selectedSoalIds, soalId])
    }
  }

  const handleRemoveSoal = (soalId: string) => {
    setSelectedSoalIds(selectedSoalIds.filter(id => id !== soalId))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const toAdd = selectedSoalIds.filter(id => !existingSoalIds.includes(id))
      const toRemove = existingSoalIds.filter(id => !selectedSoalIds.includes(id))

      // Remove unwanted soal
      for (const id of toRemove) {
        await removeSoal.mutateAsync({ ujian_id: ujianId, soal_id: id })
      }

      // Add new soal
      let currentUrutan = existingSoalIds.length - toRemove.length + 1
      for (const id of toAdd) {
        await addSoal.mutateAsync({ ujian_id: ujianId, soal_id: id, urutan: currentUrutan++ })
      }

      toast.success('Perubahan soal berhasil disimpan')
    } catch (error: any) {
      toast.error('Gagal menyimpan beberapa perubahan')
    } finally {
      setIsSaving(false)
    }
  }
  
  const hasChanges = 
    selectedSoalIds.length !== existingSoalIds.length || 
    selectedSoalIds.some(id => !existingSoalIds.includes(id)) || 
    existingSoalIds.some(id => !selectedSoalIds.includes(id))

  if (isLoadingUjian) {
    return (
      <GuruLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </GuruLayout>
    )
  }

  if (!ujian) {
    return (
      <GuruLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <h2 className="text-2xl font-bold">Ujian tidak ditemukan</h2>
          <Button variant="outline" onClick={() => router.push('/guru/ujian')}>
            Kembali ke Daftar Ujian
          </Button>
        </div>
      </GuruLayout>
    )
  }

  return (
    <GuruLayout>
      <div className="flex flex-col space-y-6 max-w-7xl mx-auto p-6 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/guru/ujian')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Assign Soal Ujian</h1>
              <p className="text-muted-foreground">
                Ujian: {ujian.name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel Kiri: Bank Soal Global */}
          <Card className="flex flex-col h-[75vh]">
            <CardHeader>
              <CardTitle>Bank Soal Sentral</CardTitle>
              <CardDescription>Cari dan pilih soal berdasarkan tag atau teks</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari teks soal atau tag (misal: matematika)..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {isLoadingSoal ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : soalBankList?.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  Tidak ada soal yang ditemukan di Bank Soal.
                </div>
              ) : (
                soalBankList?.map((soal: any) => {
                  const isAdded = selectedSoalIds.includes(soal.id)
                  return (
                    <div key={soal.id} className={`p-4 border rounded-lg ${isAdded ? 'bg-muted/50 border-muted' : 'bg-card'}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={soal.question_type === 'essay' ? 'default' : 'secondary'}>
                              {soal.question_type === 'essay' ? 'Essay' : 'Pilgan'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {soal.difficulty_level}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-3">{soal.question_text}</p>
                          {soal.tags && soal.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {soal.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                                  <Tags className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant={isAdded ? "outline" : "default"}
                          disabled={isAdded}
                          onClick={() => handleAddSoal(soal.id)}
                        >
                          {isAdded ? 'DIPILIH' : <><Plus className="w-4 h-4 mr-1" /> Tambah</>}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Panel Kanan: Soal yang sudah di-assign */}
          <Card className="flex flex-col h-[75vh]">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Soal dalam Ujian Ini ({selectedSoalIds.length})</CardTitle>
                <CardDescription>Daftar soal yang akan dikerjakan siswa</CardDescription>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || isSaving}
                className={hasChanges ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {hasChanges ? "Simpan Perubahan" : "Tersimpan"}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4 bg-muted/20 p-4 rounded-b-lg">
              {selectedSoalIds.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <ArrowLeft className="w-6 h-6" />
                  </div>
                  Pilih soal dari bank soal di sebelah kiri
                </div>
              ) : (
                selectedSoalIds.map((soalId, index) => {
                  const soalData = ujian.ujian_soal?.find((us: any) => us.soal_id === soalId)?.soal 
                    || soalBankList?.find((s: any) => s.id === soalId)
                  
                  return (
                    <div key={soalId} className="p-4 border bg-background rounded-lg shadow-sm">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                              {index + 1}
                            </span>
                            <Badge variant={soalData?.question_type === 'essay' ? 'default' : 'secondary'}>
                              {soalData?.question_type === 'essay' ? 'Essay' : 'Pilgan'}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-3">{soalData?.question_text || 'Pertanyaan tidak tersedia'}</p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="destructive"
                          onClick={() => handleRemoveSoal(soalId)}
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </GuruLayout>
  )
}
