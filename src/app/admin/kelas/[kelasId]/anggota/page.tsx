'use client';

import React from 'react';
import { AnggotaKelasPage } from '@/components/kelas/anggota-kelas-page';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guards';

interface PageProps {
  params: Promise<{
    kelasId: string;
  }>;
}

export default function AnggotaKelasPageRoute({ params }: PageProps) {
  const resolvedParams = React.use(params);
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <AdminLayout>
        <AnggotaKelasPage kelasId={resolvedParams.kelasId} />
      </AdminLayout>
    </AuthGuard>
  );
}