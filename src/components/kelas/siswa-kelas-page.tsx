'use client';

import React, { useState } from 'react';
import { Plus, Users, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useKelasSiswa } from '@/hooks/use-kelas';
import { useRouter } from 'next/navigation';
import { toastSuccess, toastError } from '@/lib/toast';

export function SiswaKelasPage() {
  const router = useRouter();
  const { data: kelasList = [], isLoading, refetch } = useKelasSiswa();

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

  // Skeleton component untuk loading state
  const KelasSkeleton = () => (
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
          <h1 className="text-3xl font-bold text-gray-900">Kelas Saya</h1>
          <p className="text-gray-600 mt-2">
            Lihat semua kelas yang Anda ikuti
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KelasSkeleton key={`kelas-skeleton-${i}`} />
          ))}
        </div>
      ) : kelasList.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Belum Ada Kelas
          </h3>
          <p className="text-gray-500 mb-4">
            Anda belum dimasukkan ke kelas manapun. Harap hubungi admin atau guru Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kelasList.map((kelas: any) => (
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
    </div>
  );
}