'use client'

import { useRouter } from 'next/navigation'
import { useKelasSiswa } from '@/hooks/use-kelas'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from '@/components/ui/skeleton'
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Calendar,
  School,
} from 'lucide-react'
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
  const router = useRouter()
  const { user } = useAuthStore()
  
  const { data: rawKelasList = [], isLoading, refetch } = useKelasSiswa()

  // Filter hanya kelas aktif sebagai double-check (API sudah filter tapi ini untuk safety)
  const kelasList = rawKelasList.filter((kelas: any) => {
    // STRICT: Hanya include kelas yang eksplisit is_active = true
    return kelas.is_active === true;
  })

  const handleViewKelas = (kelasId: string) => {
    router.push(`/siswa/kelas/${kelasId}`)
  }

  return (
    <>
      {/* Header Section */}
      <div className="space-y-6">
        {/* Welcome Card with Stats - Only show when there are active classes */}
        {/*!isLoading && kelasList.length > 0 && (
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
        )*/}

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
              Anda belum dimasukkan ke kelas manapun. Harap hubungi admin atau guru Anda.
            </p>
          </div>
        ) : (
          <>
            {/* Kelas Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kelasList.map((kelas: any, index: number) => (
                <KelasCard
                  key={kelas.id || `kelas-${index}`}
                  kelas={kelas}
                  onViewKelas={handleViewKelas}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}