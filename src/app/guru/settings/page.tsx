'use client'

import { GuruLayout } from '@/components/layout/guru-layout'
import { useAuthStore } from '@/store/auth'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User,
  Bell,
  Lock,
  Palette,
  Database,
  Save
} from 'lucide-react'

export default function GuruSettingsPage() {
  const { profile } = useAuthStore()

  return (
    <GuruLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600">
            Kelola preferensi dan konfigurasi akun Anda
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil
              </CardTitle>
              <CardDescription>
                Informasi dasar akun Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input 
                    id="fullName" 
                    defaultValue={profile?.full_name || ''} 
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    defaultValue={profile?.email || ''} 
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input 
                  id="bio" 
                  placeholder="Ceritakan sedikit tentang Anda..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifikasi
              </CardTitle>
              <CardDescription>
                Atur preferensi notifikasi Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifikasi Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Terima notifikasi melalui email
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ujian Baru Selesai</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifikasi ketika siswa menyelesaikan ujian
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Laporan Mingguan</Label>
                  <p className="text-sm text-muted-foreground">
                    Ringkasan aktivitas mingguan
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Keamanan
              </CardTitle>
              <CardDescription>
                Pengaturan keamanan akun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Saat Ini</Label>
                <Input 
                  id="currentPassword" 
                  type="password"
                  placeholder="Masukkan password saat ini"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input 
                    id="newPassword" 
                    type="password"
                    placeholder="Password baru"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password"
                    placeholder="Konfirmasi password baru"
                  />
                </div>
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan lapisan keamanan ekstra
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          {/* Exam Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Pengaturan Ujian
              </CardTitle>
              <CardDescription>
                Konfigurasi default untuk ujian
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultDuration">Durasi Default (menit)</Label>
                  <Input 
                    id="defaultDuration" 
                    type="number"
                    defaultValue="60"
                    min="1"
                    max="300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingGrade">Nilai Kelulusan (%)</Label>
                  <Input 
                    id="passingGrade" 
                    type="number"
                    defaultValue="70"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <hr className="border-gray-200" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-publish Ujian</Label>
                    <p className="text-sm text-muted-foreground">
                      Otomatis publikasikan ujian setelah dibuat
                    </p>
                  </div>
                  <input type="checkbox" className="w-4 h-4" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Questions</Label>
                    <p className="text-sm text-muted-foreground">
                      Acak urutan soal secara default
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Review</Label>
                    <p className="text-sm text-muted-foreground">
                      Izinkan siswa meninjau jawaban setelah ujian
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Tampilan
              </CardTitle>
              <CardDescription>
                Personalisasi tampilan aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mode Gelap</Label>
                  <p className="text-sm text-muted-foreground">
                    Gunakan tema gelap untuk aplikasi
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sidebar Kompak</Label>
                  <p className="text-sm text-muted-foreground">
                    Gunakan sidebar yang lebih kecil
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button className="min-w-32">
              <Save className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </div>
    </GuruLayout>
  )
}
