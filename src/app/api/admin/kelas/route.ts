import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { generateKodeKelas } from '@/lib/kelas/generate-kode';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { adminKelasCreateSchema } from './_schema';
import type { AdminKelasCreatePayload } from './_schema';
import { adminWriteLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/api/check-rate-limit';

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/kelas - List all kelas (admin only, auth required)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    const { data: kelasList, error } = await adminSupabase
      .from('kelas')
      .select(`
        *,
        profiles:created_by (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching kelas:', error);
      return NextResponse.json({ success: false, error: 'Gagal mengambil data kelas' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: kelasList,
      count: kelasList?.length || 0
    });

  } catch (_error: unknown) {
    logger.error('Error in GET /api/admin/kelas:', _error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

/**
 * POST /api/admin/kelas - Create test kelas (admin only, auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    // Rate limit admin writes
    const limited = checkRateLimit(adminWriteLimiter(user.id));
    if (limited) return limited;

    const adminSupabase = await createAdminClient();

    const parsed = await parseJsonBody<AdminKelasCreatePayload>(request, adminKelasCreateSchema);
    if ('response' in parsed) return parsed.response;
    const { nama_kelas, guru_id } = parsed.data;

    const kodeKelas = generateKodeKelas();

    let finalGuruId = guru_id;
    if (!finalGuruId) {
      const { data: guruProfile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'guru')
        .limit(1)
        .single();
      finalGuruId = guruProfile?.id;
    }

    if (!finalGuruId) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 400 });
    }

    const { data: newKelas, error } = await adminSupabase
      .from('kelas')
      .insert({
        nama_kelas: nama_kelas ?? 'Test Kelas Debug',
        kode_kelas: kodeKelas,
        created_by: finalGuruId
      })
      .select(`
        *,
        profiles:created_by (
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating test kelas:', error);
      return NextResponse.json({ success: false, error: 'Gagal membuat kelas' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test kelas berhasil dibuat',
      data: newKelas,
      kode_kelas: kodeKelas
    });

  } catch (_error: unknown) {
    logger.error('Error in POST /api/admin/kelas:', _error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
