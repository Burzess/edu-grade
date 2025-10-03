'use client';

import { KelolaKelasPage } from '@/components/kelas/kelola-kelas-page';
import { GuruLayout } from '@/components/layout/guru-layout';
import { AuthGuard } from '@/components/auth/auth-guards';

export default function GuruKelasPage() {
  return (
    <AuthGuard requiredRole="guru">
      <GuruLayout>
        <KelolaKelasPage />
      </GuruLayout>
    </AuthGuard>
  );
}