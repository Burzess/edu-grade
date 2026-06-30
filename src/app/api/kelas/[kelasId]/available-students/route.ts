import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const uuidSchema = z.string().uuid('Format ID kelas tidak valid');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;

    const kelasIdParsed = uuidSchema.safeParse(kelasId);
    if (!kelasIdParsed.success) {
      return NextResponse.json({ error: 'ID kelas tidak valid' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Ambil daftar user yang memiliki role 'siswa'
    const { data: semuaSiswa, error: errorSiswa } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'siswa')
      .order('full_name', { ascending: true });

    if (errorSiswa) {
      return NextResponse.json(
        { error: 'Gagal mengambil data siswa' },
        { status: 400 }
      );
    }

    // Ambil daftar anggota kelas saat ini
    const { data: anggotaKelas, error: errorAnggota } = await supabase
      .from('kelas_members')
      .select('siswa_id')
      .eq('kelas_id', kelasId);

    if (errorAnggota) {
      return NextResponse.json(
        { error: 'Gagal mengambil data anggota kelas' },
        { status: 400 }
      );
    }

    // Filter siswa yang belum menjadi anggota kelas
    const anggotaIdSet = new Set(anggotaKelas?.map((a) => a.siswa_id) || []);
    const availableStudents = semuaSiswa?.filter((s) => !anggotaIdSet.has(s.id)) || [];

    return NextResponse.json({
      success: true,
      data: availableStudents,
    });
  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
