'use client';

import React, { useState } from 'react';
import { Plus, Users, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useKelasSiswa } from '@/hooks/use-kelas';

export function SiswaKelasWidget() {
  const router = useRouter();
  
  // Use hooks untuk consistent data management
  const { data: kelasList = [], isLoading, refetch } = useKelasSiswa();

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
        <CardHeader className="flex flex-row items-center space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Kelas Saya
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {kelasList.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Anda belum dimasukkan ke kelas manapun.
              </p>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}