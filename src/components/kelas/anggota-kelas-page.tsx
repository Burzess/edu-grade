'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserMinus, Users, Calendar, Mail, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toastSuccess, toastError } from '@/lib/toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// import { useToast } from '@/hooks/use-toast';
import { GetMembersResponse, KelasMemberDetail } from '@/types/kelas';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';

// Helper untuk mendapatkan valid access token dengan validasi user
async function getValidAccessToken(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

interface AnggotaKelasPageProps {
  kelasId: string;
}

export function AnggotaKelasPage({ kelasId }: AnggotaKelasPageProps) {
  const [kelasData, setKelasData] = useState<{
    kelas: { id: string; nama_kelas: string };
    members: KelasMemberDetail[];
    total_members: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Use consistent auth pattern
  const { user } = useAuthStore();
  const supabase = createClient();
  const router = useRouter();



  const fetchMembers = async () => {
    try {
      setIsLoading(true);

      console.log('🔄 AnggotaKelas: Fetching members for kelas:', kelasId);
      console.log('🔄 AnggotaKelas: Current user from auth store:', user?.id);

      // Validasi user terlebih dahulu dengan getUser(), lalu ambil token
      const accessToken = await getValidAccessToken(supabase);
      console.log('🔄 AnggotaKelas: Token validation:', {
        hasToken: !!accessToken
      });

      if (!accessToken) {
        console.warn('❌ AnggotaKelas: Session tidak valid - redirecting to login');
        toastError('Error', 'Session expired, silakan login ulang');
        router.push('/login');
        setIsLoading(false);
        return;
      }

      console.log('🔄 AnggotaKelas: Making API call to fetch members...');

      const response = await fetch(`/api/kelas/${kelasId}/members`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      console.log('🔄 AnggotaKelas: API response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('❌ AnggotaKelas: Kelas not found or access denied');
          toastError('Error', 'Kelas tidak ditemukan atau Anda tidak memiliki akses');
          router.back();
          return;
        } else if (response.status === 401) {
          console.warn('❌ AnggotaKelas: Unauthorized - redirecting to login');
          toastError('Error', 'Session expired, silakan login ulang');
          router.push('/login');
          return;
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result: GetMembersResponse = await response.json();
      console.log('✅ AnggotaKelas: Members fetched successfully:', result);

      if (result.success) {
        setKelasData(result.data);
      } else {
        throw new Error('Failed to fetch members from API');
      }
    } catch (error: unknown) {
      console.error('❌ AnggotaKelas: Error fetching members:', error);
      toastError('Error', 'Gagal memuat data anggota kelas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 AnggotaKelas: Component mounted with:', { kelasId, userId: user?.id });

    if (!user?.id) {
      console.warn('❌ AnggotaKelas: No user in auth store - redirecting to login');
      router.push('/login');
      return;
    }

    if (kelasId) {
      fetchMembers();
    }
  }, [kelasId, user?.id]);

  const handleRemoveMember = async (siswaId: string, namaSiswa: string) => {
    try {
      setRemovingMemberId(siswaId);

      console.log('🔄 AnggotaKelas: Removing member:', { siswaId, namaSiswa, kelasId });
      console.log('🔄 AnggotaKelas: Current user:', user?.id);

      // Validasi user terlebih dahulu dengan getUser(), lalu ambil token
      const accessToken = await getValidAccessToken(supabase);
      console.log('🔄 AnggotaKelas: Token for remove:', {
        hasToken: !!accessToken
      });

      if (!accessToken) {
        console.warn('❌ AnggotaKelas: Session tidak valid - redirecting to login');
        toastError('Error', 'Session expired, silakan login ulang');
        router.push('/login');
        setRemovingMemberId(null);
        return;
      }

      console.log('🔄 AnggotaKelas: Making DELETE API call...');

      const response = await fetch(`/api/kelas/${kelasId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ siswa_id: siswaId }),
      });

      console.log('🔄 AnggotaKelas: Remove API response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('❌ AnggotaKelas: Unauthorized for remove - redirecting to login');
          toastError('Error', 'Session expired, silakan login ulang');
          router.push('/login');
          return;
        }
        throw new Error(`Remove API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ AnggotaKelas: Remove result:', result);

      if (result.success) {
        toastSuccess('Berhasil!', result.message || `${namaSiswa} berhasil dikeluarkan dari kelas`);
        fetchMembers(); // Refresh data
      } else {
        throw new Error(result.error || 'Failed to remove member');
      }
    } catch (error: unknown) {
      console.error('❌ AnggotaKelas: Error removing member:', error);
      toastError('Error', 'Gagal mengeluarkan siswa dari kelas');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!kelasData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Data tidak ditemukan
          </h1>
          <Button onClick={() => router.back()}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Anggota Kelas
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            {kelasData.kelas.nama_kelas}
          </p>
        </div>
      </div>

      {/* Stats Card */}
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-brand-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Total Anggota</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {kelasData.total_members} siswa bergabung dalam kelas ini
              </p>
            </div>
          </div>
          {/* <div className="text-3xl font-bold text-blue-600">
            {kelasData.total_members}
          </div> */}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Daftar Anggota Kelas</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {kelasData.members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4 dark:text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-100">
                Belum Ada Siswa
              </h3>
              <p className="text-gray-500 dark:text-gray-300">
                Belum ada siswa yang bergabung ke kelas ini.
                Bagikan kode kelas kepada siswa untuk bergabung.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {(() => {
                const filteredMembers = kelasData.members.filter((member) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    member.nama_siswa?.toLowerCase().includes(query) ||
                    member.email?.toLowerCase().includes(query)
                  );
                });

                if (filteredMembers.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Search className="mx-auto h-12 w-12 text-gray-400 mb-4 dark:text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2 dark:text-gray-100">
                        Tidak Ditemukan
                      </h3>
                      <p className="text-gray-500 dark:text-gray-300">
                        Tidak ada siswa yang cocok dengan pencarian &quot;{searchQuery}&quot;
                      </p>
                    </div>
                  );
                }

                return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No.</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member, index) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                            <span className="text-sm font-medium">
                              {member.nama_siswa?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="font-medium">
                            {member.nama_siswa || 'Nama tidak tersedia'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" /> */}
                          <span className="text-gray-600 dark:text-gray-300">
                            {member.email || 'Email tidak tersedia'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-400" /> */}
                          <span className="text-gray-600 dark:text-gray-300">
                            {formatDate(member.tanggal_bergabung)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-400"
                              disabled={removingMemberId === member.siswa_id}
                            >
                              <UserMinus className="h-4 w-4 mr-1" />
                              {removingMemberId === member.siswa_id ? 'Mengeluarkan...' : 'Keluarkan'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Konfirmasi Pengeluaran Siswa
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Apakah Anda yakin ingin mengeluarkan{' '}
                                <strong>{member.nama_siswa}</strong> dari kelas ini?
                                <br />
                                <br />
                                Siswa ini tidak akan bisa mengakses ujian di kelas ini lagi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.siswa_id, member.nama_siswa)}
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                              >
                                Ya, Keluarkan
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}