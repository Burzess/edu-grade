import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ROLES } from '@/types/auth';
import { generateKodeKelas } from '@/lib/kelas/generate-kode';
import { parseJsonBody } from '@/lib/api/parse-json-body';

export const dynamic = 'force-dynamic'

const kelasUpdateSchema = z.object({
  kelas_id: z.string().uuid('Kelas ID harus UUID valid'),
  nama_kelas: z.string().min(1, 'Nama kelas tidak boleh kosong').trim().optional(),
  is_active: z.boolean().optional(),
});

const kelasCreateSchema = z.object({
  nama_kelas: z.string().min(1, 'Nama kelas wajib diisi').trim(),
});

/**
 * GET /api/kelas - Mendapatkan daftar kelas berdasarkan role user
 *
 * Auth: any authenticated user (guru / siswa / admin). Per-role payload
 * shape is preserved from the unfixed code — admin sees `{ data: [] }`
 * because there is no admin-specific branch yet.
 */
export async function GET(request: NextRequest) {
  try {
    // _Bug_Condition (1.12): inline auth + role-check block replaced.
    // _Expected_Behavior (2.12): single canonical guard.
    const auth = await requireRole(request, [ROLES.GURU, ROLES.SISWA, ROLES.ADMIN]);
    if (auth instanceof NextResponse) return auth;
    const { user, role } = auth;

    const supabase = await createClient();

    let kelasData: Record<string, unknown>[] = [];

    if (role === ROLES.GURU) {
      // Try to get from view with is_active field
      let { data, error } = await supabase
        .from('kelas_with_member_count')
        .select('*, is_active')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // If view doesn't have is_active field, fallback to direct table query
      // _Bug_Condition (1.23): N+1 per-row count replaced with single grouped query.
      // _Expected_Behavior (2.23): single query using PostgREST embedded count.
      if (error && error.message?.includes('is_active')) {
        const { data: kelasRaw, error: kelasError } = await supabase
          .from('kelas')
          .select('id, nama_kelas, kode_kelas, created_by, is_active, created_at, updated_at, kelas_members(count)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (kelasError) {
          return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 400 });
        }

        // Transform embedded count into the expected jumlah_siswa field
        const kelasWithCount = (kelasRaw || []).map((kelas) => {
          const { kelas_members, ...rest } = kelas as Record<string, unknown> & { kelas_members: { count: number }[] };
          return { ...rest, jumlah_siswa: kelas_members?.[0]?.count ?? 0 };
        });

        data = kelasWithCount;
        error = null;
      }

      if (error) {
        return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 400 });
      }

      kelasData = (data || []) as Record<string, unknown>[];
    } else if (role === ROLES.SISWA) {
      const { data, error } = await supabase
        .from('kelas_members')
        .select(`
          kelas_id,
          joined_at,
          kelas:kelas_id (
            id, nama_kelas, kode_kelas, is_active, created_at,
            profiles:created_by ( full_name )
          )
        `)
        .eq('siswa_id', user.id)
        .eq('kelas.is_active', true)
        .order('joined_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: 'Gagal mengambil data kelas' }, { status: 400 });
      }

      // Transform data untuk siswa
      kelasData = (data || []).map((item: Record<string, unknown>) => {
        const kelasInfo = item.kelas as Record<string, unknown> | null;
        const profiles = kelasInfo?.profiles;
        const guruInfo = Array.isArray(profiles) ? profiles[0] : profiles;

        return {
          id: kelasInfo?.id,
          nama_kelas: kelasInfo?.nama_kelas,
          kode_kelas: kelasInfo?.kode_kelas,
          is_active: kelasInfo?.is_active,
          guru_name: (guruInfo as Record<string, unknown> | null)?.full_name,
          joined_at: item.joined_at,
          created_at: kelasInfo?.created_at
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: kelasData,
      role
    });

  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

/**
 * PATCH /api/kelas - Update kelas (nama dan status aktif). Guru only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(request, [ROLES.GURU]);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const supabase = await createClient();

    const body = await parseJsonBody(request, kelasUpdateSchema);
    if ('response' in body) return body.response;
    const { kelas_id, nama_kelas, is_active } = body.data;

    // Check ownership
    const { data: existingKelas, error: checkError } = await supabase
      .from('kelas')
      .select('id, nama_kelas, is_active')
      .eq('id', kelas_id)
      .eq('created_by', user.id)
      .single();

    if (checkError || !existingKelas) {
      return NextResponse.json({ error: 'Kelas tidak ditemukan atau Anda tidak memiliki akses' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nama_kelas !== undefined) updateData.nama_kelas = nama_kelas;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('kelas')
      .update(updateData)
      .eq('id', kelas_id)
      .eq('created_by', user.id)
      .select('id, nama_kelas, kode_kelas, is_active, created_at, updated_at, profiles:created_by ( full_name )')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Gagal memperbarui kelas' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Kelas berhasil diperbarui',
      data: {
        ...data,
        guru_name: (data as Record<string, unknown>).profiles
          ? ((data as Record<string, unknown>).profiles as Record<string, unknown>)?.full_name
          : 'Unknown'
      }
    });

  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

/**
 * POST /api/kelas - Membuat kelas baru. Guru only.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, [ROLES.GURU]);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const supabase = await createClient();

    const body = await parseJsonBody(request, kelasCreateSchema);
    if ('response' in body) return body.response;
    const { nama_kelas } = body.data;

    const kodeKelas = generateKodeKelas();

    const { data, error } = await supabase
      .from('kelas')
      .insert({
        nama_kelas,
        kode_kelas: kodeKelas,
        created_by: user.id,
        is_active: true
      })
      .select('*, profiles:created_by ( full_name )')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Gagal membuat kelas' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Kelas berhasil dibuat',
      data: {
        ...data,
        jumlah_siswa: 0,
        guru_name: data.profiles?.full_name
      }
    });

  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
