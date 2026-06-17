'use client';

import { KelolaKelasPage } from '@/components/kelas/kelola-kelas-page';
import { AdminLayout } from '@/components/layout/admin-layout';
import { AuthGuard } from '@/components/auth/auth-guards';

export default function AdminKelasPage() {
  return (
    <AuthGuard requiredRole="admin" showLoading={false}>
      <AdminLayout>
        <KelolaKelasPage />
      </AdminLayout>
    </AuthGuard>
  );
}