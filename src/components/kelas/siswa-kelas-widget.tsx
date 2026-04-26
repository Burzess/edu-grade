'use client';

import React, { useState } from 'react';
import { Plus, Users, BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { JoinKelasModal } from './join-kelas-modal-widget';
import { useRouter } from 'next/navigation';
import { useKelasSiswa, useJoinKelas } from '@/hooks/use-kelas';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { toastSuccess, toastError } from '@/lib/toast';

// Helper untuk mendapatkan valid access token dengan validasi user
async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

export function SiswaKelasWidget() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const router = useRouter();
  
  // Use hooks untuk consistent data management
  const { user } = useAuthStore();
  const supabase = createClient();
  const { data: kelasList = [], isLoading, refetch } = useKelasSiswa();
  const joinKelasMutation = useJoinKelas();
  


  const handleJoinKelas = async (kodeKelas: string) => {
    try {
      console.log('Widget: Joining kelas with code:', kodeKelas);
      console.log('Widget: Current user from auth store:', user?.id);
      
      // Validasi user terlebih dahulu dengan getUser(), lalu ambil token
      const accessToken = await getValidAccessToken(supabase);
      console.log('Widget: Token validation:', { 
        hasToken: !!accessToken
      });
      
      if (!user?.id || !accessToken) {
        console.warn('Widget: Session tidak valid - redirecting to login');
        toastError('Error', 'Session expired, silakan login ulang');
        router.push('/login');
        return;
      }

      // Try dengan hook pertama
      console.log('Widget: Using hook mutation...');
      const result = await joinKelasMutation.mutateAsync(kodeKelas);
      console.log('Widget: Hook result received:', result);

      // Check if result indicates success or failure
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success === false) {
          console.log('Widget: Hook returned failure:', result);
          
          // Throw error to be caught by catch block
          const errorMsg = result.message || 'Join kelas gagal';
          throw new Error(errorMsg);
        }
      }

      console.log('Widget: Join kelas successful via hook:', result);
      
      toastSuccess('Berhasil!', 'Berhasil bergabung ke kelas!');
      setShowJoinModal(false);
      
      // Refresh data
      await refetch();
      
    } catch (error: any) {
      console.error('Widget: Hook join failed, trying API fallback:', error);
      
      // Fallback ke API endpoint jika hook gagal
      try {
        // Validasi ulang dan ambil token dengan aman
        const accessToken = await getValidAccessToken(supabase);
        
        if (!accessToken) {
          throw new Error('Session tidak valid untuk API call');
        }
        
        console.log('Widget: Trying API endpoint fallback...');
        console.log(kodeKelas);
        const response = await fetch('/api/kelas/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ kode_kelas: kodeKelas }),
        });

        const result = await response.json();
        
        if (result.success) {
          console.log('Widget: Join successful via API fallback:', result);
          toastSuccess('Berhasil!', result.message);
          setShowJoinModal(false);
          await refetch();
          return;
        } else {
          throw new Error(result.message || 'API join failed');
        }
      } catch (apiError: any) {
        console.error('Widget: Both hook and API failed:', apiError);
        
        let errorMessage = 'Gagal bergabung ke kelas';
        
        // Handle error dari hook atau API
        const errorMsg = error?.message || apiError?.message || '';
        
        if (errorMsg.includes('KELAS_NOT_FOUND') || errorMsg.includes('tidak ditemukan')) {
          errorMessage = 'Kode kelas tidak ditemukan. Periksa kembali kode yang Anda masukkan.';
        } else if (errorMsg.includes('ALREADY_JOINED') || errorMsg.includes('sudah terdaftar')) {
          errorMessage = 'Anda sudah terdaftar di kelas ini.';
        } else if (errorMsg.includes('session') || errorMsg.includes('authentication')) {
          errorMessage = 'Session expired, silakan login ulang';
          router.push('/login');
        } else if (errorMsg.includes('tidak terautentikasi')) {
          errorMessage = 'Session expired, silakan login ulang';
          router.push('/login');
        } else {
          errorMessage = errorMsg || 'Gagal bergabung ke kelas';
        }

        toastError('Error', errorMessage);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kelas Saya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kelas Saya
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Gabung
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {kelasList.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Belum bergabung ke kelas manapun
              </p>
              <Button 
                size="sm" 
                onClick={() => setShowJoinModal(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Gabung Kelas Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {kelasList.slice(0, 3).map((kelas: any) => (
                  <div 
                    key={kelas.id} 
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                    onClick={() => router.push(`/siswa/kelas/${kelas.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {kelas.nama_kelas}
                      </p>
                      <p className="text-xs text-gray-500">
                        {kelas.guru_name} • {formatDate(kelas.joined_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                      {kelas.kode_kelas}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => router.push('/siswa/kelas')}
                >
                  Lihat Semua Kelas ({kelasList.length})
                </Button>
                <Button 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setShowJoinModal(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Gabung Kelas Baru
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Join Kelas Modal */}
      <JoinKelasModal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinKelas}
      />
    </>
  );
}