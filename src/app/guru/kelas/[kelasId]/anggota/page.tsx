'use client';

import React from 'react';
import { AnggotaKelasPage } from '@/components/kelas/anggota-kelas-page';
import { GuruLayout } from '@/components/layout/guru-layout';

interface PageProps {
  params: Promise<{
    kelasId: string;
  }>;
}

export default function AnggotaKelasPageRoute({ params }: PageProps) {
  const resolvedParams = React.use(params);
  return (
    <GuruLayout>
      <AnggotaKelasPage kelasId={resolvedParams.kelasId} />
    </GuruLayout>
  );
}