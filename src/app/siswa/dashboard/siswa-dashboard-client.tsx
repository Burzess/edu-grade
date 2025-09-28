'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useKelasSiswa, useJoinKelas } from '@/hooks/use-kelas'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import { JoinKelasModal } from '@/components/kelas/join-kelas-modal-widget'
import {
  BookOpen,
  Users,
  Plus,
  ChevronRight,
  GraduationCap,
  Calendar,
  Clock,
  School,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'

interface KelasCardProps {
  kelas: any
  onViewKelas: (kelasId: string) => void
}

function KelasCard({ kelas, onViewKelas }: KelasCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20" 
          onClick={() => onViewKelas(kelas.id)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {kelas.nama_kelas}
            </CardTitle>
            {kelas.deskripsi && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {kelas.deskripsi}
              </p>
            )}
          </div>
          <Badge variant="outline" className="ml-2 flex-shrink-0 text-xs">
            {kelas.kode_kelas}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Guru:</span>
            <span>{kelas.guru_name || 'Tidak diketahui'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Bergabung:</span>
            <span>{formatDate(kelas.joined_at)}</span>
          </div>

          {/* Quick stats - you can add ujian count, etc */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <School className="h-3 w-3" />
            <span>Kelas aktif</span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <Button className="w-full group-hover:bg-primary/90 transition-colors" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Masuk Kelas
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function KelasSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export default function SiswaDashboardClient() {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const router = useRouter()
  const { user } = useAuthStore()
  const supabase = createClient()
  
  const { data: kelasList = [], isLoading, refetch } = useKelasSiswa()
  const joinKelasMutation = useJoinKelas()

  // Temporary toast implementation
  const toast = ({ title, description, variant }: any) => {
    console.log('Toast:', { title, description, variant });
    alert(title + (description ? ': ' + description : ''));
  };

  const handleViewKelas = (kelasId: string) => {
    router.push(`/siswa/kelas/${kelasId}`)
  }

  const handleJoinKelas = async (kodeKelas: string) => {
    try {
      console.log('🔄 Dashboard: Joining kelas with code:', kodeKelas);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!user?.id || !session?.access_token) {
        console.warn('❌ Dashboard: No user session');
        toast({
          title: 'Error',
          description: 'Session expired, silakan login ulang',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      const result = await joinKelasMutation.mutateAsync(kodeKelas);
      
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success === false) {
          throw new Error(result.message || 'Join kelas gagal');
        }
      }

      console.log('✅ Dashboard: Join kelas successful:', result);
      
      toast({
        title: 'Berhasil!',
        description: 'Berhasil bergabung ke kelas!',
      });
      setShowJoinModal(false);
      
      // Refresh data
      await refetch();
      
    } catch (error: any) {
      console.error('❌ Dashboard: Join failed:', error);
      
      let errorMessage = 'Gagal bergabung ke kelas';
      const errorMsg = error?.message || '';
      
      if (errorMsg.includes('KELAS_NOT_FOUND') || errorMsg.includes('tidak ditemukan')) {
        errorMessage = 'Kode kelas tidak ditemukan. Periksa kembali kode yang Anda masukkan.';
      } else if (errorMsg.includes('ALREADY_JOINED') || errorMsg.includes('sudah terdaftar')) {
        errorMessage = 'Anda sudah terdaftar di kelas ini.';
      } else if (errorMsg.includes('session') || errorMsg.includes('authentication')) {
        errorMessage = 'Session expired, silakan login ulang';
        router.push('/login');
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="space-y-6">
        {/* Welcome Card with Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <School className="h-4 w-4" />
                Total Kelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kelasList.length}</div>
              <p className="text-xs text-muted-foreground">Kelas yang diikuti</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <KelasSkeleton key={`kelas-skeleton-${i}`} />
            ))}
          </div>
        ) : kelasList.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Belum Ada Kelas
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Anda belum bergabung ke kelas manapun. Mulai dengan bergabung ke kelas pertama Anda menggunakan kode kelas dari guru.
            </p>
            <Button 
              onClick={() => setShowJoinModal(true)}
              size="lg"
              className="px-8"
            >
              <Plus className="h-5 w-5 mr-2" />
              Gabung Kelas Pertama
            </Button>
          </div>
        ) : (
          <>
            {/* Kelas Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kelasList.map((kelas) => (
                <KelasCard
                  key={kelas.id}
                  kelas={kelas}
                  onViewKelas={handleViewKelas}
                />
              ))}
            </div>

            {/* Quick Action Card */}
            <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Bergabung Kelas Baru
                </h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  Punya kode kelas dari guru? Masukkan kode kelas untuk bergabung dan mulai belajar.
                </p>
                <Button onClick={() => setShowJoinModal(true)} className="px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Masukkan Kode Kelas
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Join Kelas Modal */}
      <JoinKelasModal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinKelas}
      />
    </>
  )
}