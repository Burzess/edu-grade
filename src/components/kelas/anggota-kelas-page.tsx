'use client';

import React, { useState } from 'react';
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
import { useUserRole } from '@/store/auth';
import { useKelasMembers, useRemoveKelasMember } from '@/hooks/use-kelas';
import { AddMemberDialog } from './add-member-dialog';

interface AnggotaKelasPageProps {
  kelasId: string;
}

export function AnggotaKelasPage({ kelasId }: AnggotaKelasPageProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const userRole = useUserRole();
  const router = useRouter();
  const { data: kelasData, isLoading } = useKelasMembers(kelasId);
  const removeMember = useRemoveKelasMember(kelasId);


  const handleRemoveMember = async (siswaId: string, namaSiswa: string) => {
    try {
      setRemovingMemberId(siswaId);
      await removeMember.mutateAsync(siswaId);
      toastSuccess('Berhasil!', `${namaSiswa} berhasil dikeluarkan dari kelas`);
    } catch (error: unknown) {
      console.error('Error removing member:', error);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 -ml-4"
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

        {(userRole === 'admin' || userRole === 'guru') && (
          <AddMemberDialog kelasId={kelasId} />
        )}
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
                            {formatDate(member.tanggal_bergabung || member.joined_at)}
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