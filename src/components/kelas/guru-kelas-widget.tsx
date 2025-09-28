'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, Copy, MoreVertical } from 'lucide-react';
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
import { KelasWithMemberCount } from '@/types/kelas';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function GuruKelasWidget() {
  const [kelasList, setKelasList] = useState<KelasWithMemberCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  
  // Temporary toast implementation
  const toast = ({ title, description, variant }: any) => {
    console.log('Toast:', { title, description, variant });
    alert(title + (description ? ': ' + description : ''));
  };

  const fetchKelas = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      const response = await fetch('/api/kelas', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch kelas');
      }

      const result = await response.json();
      
      if (result.success) {
        setKelasList(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to fetch kelas');
      }
    } catch (error) {
      console.error('Error fetching kelas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);

  const handleCreateKelas = async (data: { nama_kelas: string; deskripsi: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No session for create kelas widget');
        return;
      }

      const response = await fetch('/api/kelas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil!',
          description: result.message,
        });
        setShowCreateModal(false);
        fetchKelas(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to create kelas');
      }
    } catch (error) {
      console.error('Error creating kelas:', error);
      toast({
        title: 'Error',
        description: 'Gagal membuat kelas',
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
                        <Badge variant="outline" className="text-xs">
                          {kelas.kode_kelas}
                        </Badge>
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
                        <DropdownMenuItem onClick={() => copyKodeKelas(kelas.kode_kelas)}>
                          <Copy className="mr-2 h-3 w-3" />
                          Salin Kode
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

      {/* Create Kelas Modal */}
      <CreateKelasModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateKelas}
      />
    </>
  );
}