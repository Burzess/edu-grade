'use client';

import React, { useState } from 'react';
import { Plus, Users, Copy, MoreVertical, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CreateKelasModal } from './create-kelas-modal';
import { useKelasGuru, useCreateKelas } from '@/hooks/use-kelas';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { KelasWithMemberCount } from '@/types/kelas';
import { useRouter } from 'next/navigation';

export function KelolaKelasPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  
  // Initialize clients and auth
  const supabase = createClient();
  const { user } = useAuthStore();
  
  // Use hooks seperti halaman hasil
  const { data: kelasList = [], isLoading } = useKelasGuru();
  const createKelasMutation = useCreateKelas();

  // Temporary toast implementation
  const toast = ({ title, description, variant }: any) => {
    console.log('Toast:', { title, description, variant });
    alert(title + (description ? ': ' + description : ''));
  };

  // Handle create kelas via API endpoint untuk bypass RLS issue
  const handleCreateKelas = async (data: { nama_kelas: string; deskripsi: string }) => {
    try {
      console.log('🔄 Creating kelas via API endpoint:', data);
      
      // Get auth session untuk authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      
      // Call API endpoint yang akan handle RLS bypass
      const response = await fetch('/api/kelas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nama_kelas: data.nama_kelas.trim(),
          deskripsi: data.deskripsi?.trim() || null
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API response error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to create kelas');
      }
      
      const result = await response.json();
      console.log('✅ Kelas created via API:', result);
      
      toast({
        title: 'Berhasil!',
        description: result.message || 'Kelas berhasil dibuat',
      });
      setShowCreateModal(false);
      
      // Refresh data setelah create dengan reload halaman
      window.location.reload();
      
    } catch (error) {
      console.error('❌ API create error:', error);
      
      let errorMessage = 'Gagal membuat kelas';
      
      if (error instanceof Error) {
        if (error.message.includes('42P17') || error.message.includes('infinite recursion')) {
          errorMessage = 'Masalah konfigurasi database. Admin sedang memperbaiki, coba lagi nanti.';
        } else if (error.message.includes('duplicate')) {
          errorMessage = 'Nama kelas sudah ada, silakan gunakan nama lain';
        } else if (error.message.includes('authorization') || error.message.includes('authenticated')) {
          errorMessage = 'Session expired, silakan login ulang';
        } else if (error.message.includes('teachers')) {
          errorMessage = 'Hanya guru yang dapat membuat kelas';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const copyKodeKelas = (kodeKelas: string) => {
    navigator.clipboard.writeText(kodeKelas);
    toast({
      title: 'Berhasil!',
      description: 'Kode kelas berhasil disalin ke clipboard',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleViewMembers = (kelasId: string) => {
    router.push(`/guru/kelas/${kelasId}/anggota`);
  };

  // Skeleton component untuk loading state
  const KelasCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
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
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Kelola Kelas</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage kelas virtual Anda dan undang siswa dengan kode unik
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Buat Kelas Baru
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KelasCardSkeleton key={i} />
          ))}
        </div>
      ) : kelasList.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Belum Ada Kelas
          </h3>
          <p className="text-gray-500 mb-4">
            Mulai dengan membuat kelas virtual pertama Anda
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Buat Kelas Baru
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kelasList.map((kelas) => (
            <Card key={kelas.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold truncate">
                  {kelas.nama_kelas}
                </CardTitle>
                {/* <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewMembers(kelas.id)}>
                      <Users className="mr-2 h-4 w-4" />
                      Lihat Anggota
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyKodeKelas(kelas.kode_kelas)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Salin Kode
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu> */}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {kelas.deskripsi && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {kelas.deskripsi}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">
                        {kelas.jumlah_siswa} siswa
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {kelas.kode_kelas}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Dibuat {formatDate(kelas.created_at)}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => copyKodeKelas(kelas.kode_kelas)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Salin Kode
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewMembers(kelas.id)}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Anggota
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Kelas Modal */}
      <CreateKelasModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateKelas}
      />
    </div>
  );
}