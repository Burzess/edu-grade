'use client'

import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import {
  Database as DatabaseIcon,
  Lock,
  Palette,
  Save,
  User,
} from 'lucide-react'

import { GuruLayout } from '@/components/layout/guru-layout'
import { useTheme } from '@/components/providers/theme-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  dispatchGuruPreferencesUpdated,
  loadGuruPreferences,
  loadGuruPreferencesFromDB,
  saveGuruPreferencesToDB,
  updateGuruPreferences,
} from '@/lib/guru-preferences'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import type { Database } from '@/types/database'

export default function GuruSettingsPage() {
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setCachedProfile = useAuthStore((state) => state.setCachedProfile)
  const setUser = useAuthStore((state) => state.setUser)
  const { theme, setTheme } = useTheme()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [defaultDuration, setDefaultDuration] = useState(60)
  const [passingGrade, setPassingGrade] = useState(70)
  const [autoPublish, setAutoPublish] = useState(false)
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [allowReview, setAllowReview] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [sidebarCompact, setSidebarCompact] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setEmail(profile.email ?? '')
  }, [profile])

  useEffect(() => {
    // Load dari localStorage sebagai initial state (cepat)
    const localPrefs = loadGuruPreferences()
    setDefaultDuration(localPrefs.examDefaults.defaultDuration)
    setPassingGrade(localPrefs.examDefaults.passingGrade)
    setAutoPublish(localPrefs.examDefaults.autoPublish)
    setShuffleQuestions(localPrefs.examDefaults.shuffleQuestions)
    setAllowReview(localPrefs.examDefaults.allowReview)
    setSidebarCompact(localPrefs.sidebarCompact)

    // Kemudian load dari database (sumber kebenaran)
    if (!profile?.id) {
      setIsLoadingPrefs(false)
      return
    }

    const supabase = createClient()
    loadGuruPreferencesFromDB(supabase, profile.id)
      .then((dbPrefs) => {
        setDefaultDuration(dbPrefs.examDefaults.defaultDuration)
        setPassingGrade(dbPrefs.examDefaults.passingGrade)
        setAutoPublish(dbPrefs.examDefaults.autoPublish)
        setShuffleQuestions(dbPrefs.examDefaults.shuffleQuestions)
        setAllowReview(dbPrefs.examDefaults.allowReview)
        setSidebarCompact(dbPrefs.sidebarCompact)
      })
      .finally(() => setIsLoadingPrefs(false))
  }, [profile?.id])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsDarkMode(document.documentElement.classList.contains('dark'))
  }, [theme])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSaving) return
    setIsSaving(true)

    const normalizedFullName = fullName.trim()
    const normalizedEmail = email.trim()
    const durationValue = Number(defaultDuration)
    const passingValue = Number(passingGrade)

    if (!normalizedFullName) {
      toast.error('Nama lengkap wajib diisi')
      setIsSaving(false)
      return
    }

    if (!normalizedEmail) {
      toast.error('Email wajib diisi')
      setIsSaving(false)
      return
    }

    if (!Number.isFinite(durationValue) || durationValue < 1 || durationValue > 300) {
      toast.error('Durasi default harus antara 1-300 menit')
      setIsSaving(false)
      return
    }

    if (!Number.isFinite(passingValue) || passingValue < 0 || passingValue > 100) {
      toast.error('Nilai kelulusan harus antara 0-100')
      setIsSaving(false)
      return
    }

    const prefsToSave = {
      examDefaults: {
        defaultDuration: durationValue,
        passingGrade: passingValue,
        autoPublish,
        shuffleQuestions,
        allowReview,
      },
      sidebarCompact,
    }

    // Simpan ke localStorage (cache lokal)
    updateGuruPreferences(prefsToSave)
    dispatchGuruPreferencesUpdated()
    setTheme(isDarkMode ? 'dark' : 'light')

    if (!profile?.id) {
      toast.error('Profil belum siap. Silakan muat ulang halaman.')
      setIsSaving(false)
      return
    }

    const supabase = createClient()

    // Simpan preferensi ke database
    const prefResult = await saveGuruPreferencesToDB(supabase, profile.id, prefsToSave)
    if (!prefResult.success) {
      toast.error('Gagal menyimpan preferensi ke database')
      setIsSaving(false)
      return
    }

    const shouldUpdatePassword =
      currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0

    if (shouldUpdatePassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        toast.error('Lengkapi semua field password')
        setIsSaving(false)
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error('Konfirmasi password tidak sesuai')
        setIsSaving(false)
        return
      }

      if (newPassword.length < 6) {
        toast.error('Password baru minimal 6 karakter')
        setIsSaving(false)
        return
      }

      const reauthEmail = profile.email || normalizedEmail
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: reauthEmail,
        password: currentPassword,
      })

      if (reauthError) {
        toast.error('Password saat ini salah')
        setIsSaving(false)
        return
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (passwordError) {
        toast.error('Gagal memperbarui password')
        setIsSaving(false)
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    type ProfileRow = Database['public']['Tables']['profiles']['Row']
    const profileUpdates: Partial<ProfileRow> = {}
    const authUpdates: { email?: string; data?: { full_name?: string } } = {}

    if (normalizedFullName !== (profile.full_name ?? '')) {
      profileUpdates.full_name = normalizedFullName
      authUpdates.data = { full_name: normalizedFullName }
    }

    if (normalizedEmail !== (profile.email ?? '')) {
      profileUpdates.email = normalizedEmail
      authUpdates.email = normalizedEmail
    }

    if (Object.keys(authUpdates).length > 0) {
      const { data: authData, error: authError } = await supabase.auth.updateUser(authUpdates)

      if (authError) {
        toast.error('Gagal memperbarui akun')
        setIsSaving(false)
        return
      }

      if (authData.user) {
        setUser(authData.user)
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profile.id)
        .select('id, email, full_name, role, created_at, preferences')
        .single()

      if (profileError) {
        toast.error('Gagal memperbarui profil')
        setIsSaving(false)
        return
      }

      if (updatedProfile) {
        setProfile(updatedProfile)
        setCachedProfile(updatedProfile.id, updatedProfile)
      }
    }

    toast.success('Pengaturan berhasil disimpan')
    setIsSaving(false)
  }

  return (
    <GuruLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-muted-foreground">
            Kelola preferensi dan konfigurasi akun Anda
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSave}>
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
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              {/* <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input 
                  id="bio" 
                  placeholder="Ceritakan sedikit tentang Anda..."
                />
              </div> */}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          {/* <Card>
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
          </Card> */}

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
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Masukkan password saat ini"
                  />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Password baru"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Konfirmasi password baru"
                  />
                </div>
              </div>
              
              {/* <hr className="border-gray-200" /> */}
              
              {/* <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan lapisan keamanan ekstra
                  </p>
                </div>
                <input type="checkbox" className="w-4 h-4" />
              </div> */}
            </CardContent>
          </Card>

          {/* Exam Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseIcon className="h-5 w-5" />
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
                    value={defaultDuration}
                    onChange={(event) =>
                      setDefaultDuration(
                        event.target.value === '' ? 0 : Number(event.target.value)
                      )
                    }
                    min="1"
                    max="300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingGrade">Nilai Kelulusan (%)</Label>
                  <Input
                    id="passingGrade"
                    type="number"
                    value={passingGrade}
                    onChange={(event) =>
                      setPassingGrade(
                        event.target.value === '' ? 0 : Number(event.target.value)
                      )
                    }
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
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={autoPublish}
                    onChange={(event) => setAutoPublish(event.target.checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shuffle Questions</Label>
                    <p className="text-sm text-muted-foreground">
                      Acak urutan soal secara default
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={shuffleQuestions}
                    onChange={(event) => setShuffleQuestions(event.target.checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Review</Label>
                    <p className="text-sm text-muted-foreground">
                      Izinkan siswa meninjau jawaban setelah ujian
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={allowReview}
                    onChange={(event) => setAllowReview(event.target.checked)}
                  />
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
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={isDarkMode}
                  onChange={(event) => setIsDarkMode(event.target.checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sidebar Kompak</Label>
                  <p className="text-sm text-muted-foreground">
                    Gunakan sidebar yang lebih kecil
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={sidebarCompact}
                  onChange={(event) => setSidebarCompact(event.target.checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button className="min-w-32" type="submit" disabled={isSaving || isLoadingPrefs}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </GuruLayout>
  )
}
