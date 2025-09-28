'use client';

import { SiswaKelasPage } from '@/components/kelas/siswa-kelas-page';
import { SiswaLayout } from '@/components/layout/siswa-layout';

export default function SiswaKelasPageRoute() {
  // Sementara gunakan client-side saja untuk debug
  return (
    <SiswaLayout>
      <SiswaKelasPage />
    </SiswaLayout>
  );
}