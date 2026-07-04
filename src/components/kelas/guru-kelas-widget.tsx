'use client';

import React, { useState } from 'react';
import { Plus, Users, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toastSuccess, toastError } from '@/lib/toast';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { CreateKelasModal } from './create-kelas-modal';
import { useRouter } from 'next/navigation';
import { useKelasGuru, useCreateKelas } from '@/hooks/use-kelas';

export function GuruKelasWidget() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const { data: kelasList = [], isLoading } = useKelasGuru();
  const createKelas = useCreateKelas();

  const handleCreateKelas = async (data: { nama_kelas: string }) => {
    try {
      await createKelas.mutateAsync(data);
      toastSuccess('Berhasil!', 'Kelas berhasil dibuat');
      setShowCreateModal(false);
    } catch (error: unknown) {
      console.error('Error creating kelas:', error);
      toastError('Error', 'Gagal membuat kelas');
    }
  };

  const handleViewMembers = (kelasId: string) => {
    router.push(`/guru/kelas/${kelasId}/anggota`);
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
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Buat
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {kelasList.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Belum ada kelas yang dibuat
              </p>
              <Button 
                size="sm" 
                onClick={() => setShowCreateModal(true)}
                className="text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Buat Kelas Pertama
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {kelasList.slice(0, 3).map((kelas) => (
                  <div 
                    key={kelas.id} 
                    className="flex items-center justify-between p-2 rounded-md border hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {kelas.nama_kelas}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        <span>{kelas.jumlah_siswa} siswa</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewMembers(kelas.id)}>
                          <Users className="mr-2 h-3 w-3" />
                          Lihat Anggota
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              
              <div className="pt-2 border-t space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => router.push('/guru/kelas')}
                >
                  Kelola Semua Kelas ({kelasList.length})
                </Button>
                <Button 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Buat Kelas Baru
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CreateKelasModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateKelas}
      />
    </>
  );
}
