'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Badge } from "@/components/ui/badge"
import KelasSelector from "@/components/ui/kelas-selector"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Calendar,
  Clock,
  Save,
  FileText,
  School,
  Globe
} from 'lucide-react'

interface UjianFormData {
  name: string
  description: string
  kelas_id: string | null
  start_time: string
  end_time: string
  status: 'draft' | 'active' | 'ended'
  duration_minutes: number
}

interface UjianFormProps {
  initialData?: Partial<UjianFormData>
  onSubmit: (data: UjianFormData) => Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
}

export default function UjianForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  mode = 'create' 
}: UjianFormProps) {
  const [formData, setFormData] = useState<UjianFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    kelas_id: initialData?.kelas_id || null,
    start_time: initialData?.start_time || '',
    end_time: initialData?.end_time || '',
    status: initialData?.status || 'draft',
    duration_minutes: initialData?.duration_minutes || 90
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleInputChange = (field: keyof UjianFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Calculate end time based on start time and duration
  const handleStartTimeChange = (startTime: string) => {
    handleInputChange('start_time', startTime)
    
    if (startTime && formData.duration_minutes) {
      const start = new Date(startTime)
      const end = new Date(start.getTime() + formData.duration_minutes * 60000)
      handleInputChange('end_time', end.toISOString().slice(0, 16))
    }
  }

  const handleDurationChange = (duration: number) => {
    handleInputChange('duration_minutes', duration)
    
    if (formData.start_time && duration) {
      const start = new Date(formData.start_time)
      const end = new Date(start.getTime() + duration * 60000)
      handleInputChange('end_time', end.toISOString().slice(0, 16))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informasi Ujian
          </CardTitle>
          <CardDescription>
            Atur detail dasar untuk ujian Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Ujian *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Masukkan nama ujian..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Deskripsi singkat tentang ujian..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Kelas Target</Label>
            <KelasSelector
              value={formData.kelas_id}
              onValueChange={(kelasId) => handleInputChange('kelas_id', kelasId)}
              placeholder="Pilih kelas atau biarkan kosong untuk ujian global"
              allowNone={true}
              showDetails={true}
            />
            <div className="flex items-center gap-2 mt-2">
              {formData.kelas_id ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <School className="h-3 w-3" />
                  Ujian Kelas
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Ujian Global
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Jadwal Ujian
          </CardTitle>
          <CardDescription>
            Tentukan waktu mulai dan durasi ujian
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Waktu Mulai *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Durasi</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => handleDurationChange(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 menit</SelectItem>
                  <SelectItem value="45">45 menit</SelectItem>
                  <SelectItem value="60">60 menit</SelectItem>
                  <SelectItem value="90">90 menit</SelectItem>
                  <SelectItem value="120">120 menit</SelectItem>
                  <SelectItem value="180">180 menit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.end_time && (
            <div className="space-y-2">
              <Label htmlFor="end_time">Waktu Selesai (otomatis)</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                className="bg-muted"
                readOnly
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status Ujian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'draft' | 'active' | 'ended') => 
                handleInputChange('status', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    Draft (Belum Dipublikasi)
                  </div>
                </SelectItem>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Aktif (Dapat Dikerjakan)
                  </div>
                </SelectItem>
                <SelectItem value="ended">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Berakhir (Tidak Dapat Dikerjakan)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submit Actions */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline">
            Batal
          </Button>
          <Button type="submit" disabled={isLoading} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'Buat Ujian' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </form>
  )
}