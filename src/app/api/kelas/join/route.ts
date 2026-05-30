import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api/parse-json-body';

export const dynamic = 'force-dynamic'

const joinKelasSchema = z.object({
  kode_kelas: z.string().min(1, 'Kode kelas wajib diisi').trim(),
});

/**
 * POST /api/kelas/join - Siswa bergabung ke kelas menggunakan kode
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    // Validate user is siswa
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'siswa') {
      return NextResponse.json(
        { error: 'Hanya siswa yang dapat bergabung ke kelas' },
        { status: 403 }
      );
    }

    const parsed = await parseJsonBody(request, joinKelasSchema);
    if ('response' in parsed) return parsed.response;
    const { kode_kelas } = parsed.data;

    // Clean dan normalize kode kelas
    const cleanKode = kode_kelas.toLowerCase().replace(/\s+/g, '');
    
    // Validasi format kode kelas (xxx-xxx-xxx)
    const kodeRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/;
    if (!kodeRegex.test(cleanKode)) {
      return NextResponse.json(
        { error: 'Format kode kelas tidak valid. Contoh: k7b-p2m-z9x' },
        { status: 400 }
      );
    }

    // Use database function untuk join kelas
    const { data, error } = await supabase
      .rpc('join_kelas_by_code', {
        p_kode_kelas: cleanKode,
        p_siswa_id: user.id
      });

    if (error) {
      return NextResponse.json(
        { error: 'Gagal bergabung ke kelas' },
        { status: 400 }
      );
    }

    // Parse result dari function
    const result = data;
    
    if (!result.success) {
      // Handle specific error codes
      let message = result.message;
      let status = 400;

      switch (result.error) {
        case 'KELAS_NOT_FOUND':
          message = 'Kode kelas tidak ditemukan. Periksa kembali kode yang Anda masukkan.';
          status = 404;
          break;
        case 'ALREADY_JOINED':
          message = 'Anda sudah terdaftar di kelas ini.';
          status = 409;
          break;
        case 'INVALID_USER':
          message = 'User tidak valid untuk bergabung ke kelas.';
          status = 403;
          break;
      }

      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message 
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        kelas_id: result.kelas_id,
        kelas_name: result.kelas_name
      }
    });

  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
