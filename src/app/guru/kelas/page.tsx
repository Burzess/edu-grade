'use client';

import { KelolaKelasPage } from '@/components/kelas/kelola-kelas-page';
import { GuruLayout } from '@/components/layout/guru-layout';

export default function GuruKelasPage() {
  // Sementara gunakan client-side saja untuk debug
  return (
    <GuruLayout>
      <KelolaKelasPage />
    </GuruLayout>
  );
}