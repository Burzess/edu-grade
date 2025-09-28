'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JoinKelasModal } from './join-kelas-modal';
import { KelasForSiswa } from '@/types/kelas';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function SiswaKelasPage() {
  const [kelasList, setKelasList] = useState<KelasForSiswa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
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
      
      // Jangan redirect di sini - biarkan auth layout handle ini
      if (!session) {
        console.warn('No session found, waiting for auth...');
        setIsLoading(false);
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
      toast({
        title: 'Error',
        description: 'Gagal memuat data kelas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);

  const handleJoinKelas = async (kodeKelas: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No session for join kelas');
        return;
      }

      const response = await fetch('/api/kelas/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ kode_kelas: kodeKelas }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil!',
          description: result.message,
        });
        setShowJoinModal(false);
        fetchKelas(); // Refresh data
      } else {
        // Handle specific error messages
        let errorMessage = result.message;
        
        switch (result.error) {
          case 'KELAS_NOT_FOUND':
            errorMessage = 'Kode kelas tidak ditemukan. Periksa kembali kode yang Anda masukkan.';
            break;
          case 'ALREADY_JOINED':
            errorMessage = 'Anda sudah terdaftar di kelas ini.';
            break;
          default:
            errorMessage = result.message || 'Gagal bergabung ke kelas';
        }

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error joining kelas:', error);
      toast({
        title: 'Error',
        description: 'Gagal bergabung ke kelas',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleViewKelas = (kelasId: string) => {
    router.push(`/siswa/kelas/${kelasId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelas Saya</h1>
          <p className="text-gray-600 mt-2">
            Lihat semua kelas yang Anda ikuti dan bergabung ke kelas baru
          </p>
        </div>
        
        <Button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Gabung Kelas
        </Button>
      </div>

      {kelasList.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Belum Ada Kelas
          </h3>
          <p className="text-gray-500 mb-4">
            Anda belum bergabung ke kelas manapun. Mulai dengan bergabung ke kelas pertama Anda
          </p>
          <Button onClick={() => setShowJoinModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Gabung Kelas
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kelasList.map((kelas) => (
            <Card key={kelas.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {kelas.nama_kelas}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                    {kelas.kode_kelas}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {kelas.deskripsi && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {kelas.deskripsi}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>Guru: {kelas.guru_name || 'Tidak diketahui'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>Bergabung: {formatDate(kelas.joined_at)}</span>
                  </div>
                  
                  <div className="pt-3">
                    <Button 
                      className="w-full"
                      onClick={() => handleViewKelas(kelas.id)}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Lihat Kelas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Action Card */}
      <Card className="mt-8 border-dashed border-2 border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Bergabung Kelas Baru
          </h3>
          <p className="text-gray-500 text-center mb-4 max-w-md">
            Punya kode kelas dari guru? Masukkan kode kelas untuk bergabung dan mulai belajar
          </p>
          <Button onClick={() => setShowJoinModal(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Masukkan Kode Kelas
          </Button>
        </CardContent>
      </Card>

      {/* Join Kelas Modal */}
      <JoinKelasModal 
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinKelas}
      />
    </div>
  );
}