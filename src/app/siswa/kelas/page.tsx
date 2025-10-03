'use client';

import { SiswaKelasPage } from '@/components/kelas/siswa-kelas-page';
import { SiswaLayout } from '@/components/layout/siswa-layout';
import { AuthGuard } from '@/components/auth/auth-guards';

export default function SiswaKelasPageRoute() {
  return (
    <AuthGuard requiredRole="siswa">
      <SiswaLayout>
        <SiswaKelasPage />
      </SiswaLayout>
    </AuthGuard>
  );
}