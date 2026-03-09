import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

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
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to get user profile' }, { status: 400 });
    }

    let kelasData: Record<string, unknown>[] = [];

    if (profile.role === 'guru') {
      // Try to get from view with is_active field
      let { data, error } = await supabase
        .from('kelas_with_member_count')
        .select('*, is_active')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      // If view doesn't have is_active field, fallback to direct table query
      if (error && error.message?.includes('is_active')) {
        const { data: kelasRaw, error: kelasError } = await supabase
          .from('kelas')
          .select('id, nama_kelas, kode_kelas, created_by, is_active, created_at, updated_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (kelasError) {
          return NextResponse.json({ error: 'Failed to fetch kelas data' }, { status: 400 });
        }

        // Get member count for each kelas manually
        const kelasWithCount = await Promise.all(
          (kelasRaw || []).map(async (kelas) => {
            const { count } = await supabase
              .from('kelas_members')
              .select('*', { count: 'exact', head: true })
              .eq('kelas_id', kelas.id);
            return { ...kelas, jumlah_siswa: count || 0 };
          })
        );

        data = kelasWithCount;
        error = null;
      }

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch kelas data' }, { status: 400 });
      }

      kelasData = (data || []) as Record<string, unknown>[];
    } else if (profile.role === 'siswa') {
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
        return NextResponse.json({ error: 'Failed to fetch kelas data' }, { status: 400 });
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
      role: profile.role
    });

  } catch (error: unknown) {
    console.error('Error in GET /api/kelas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/kelas - Update kelas (nama dan status aktif)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Only teachers can update classes' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = kelasUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { kelas_id, nama_kelas, is_active } = parsed.data;

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
      console.error('Database error updating kelas:', error);
      return NextResponse.json({ error: 'Failed to update kelas' }, { status: 400 });
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

  } catch (error: unknown) {
    console.error('Error in PATCH /api/kelas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/kelas - Membuat kelas baru (hanya guru)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Only teachers can create classes' }, { status: 403 });
    }

    const body: unknown = await request.json();
    const parsed = kelasCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { nama_kelas } = parsed.data;

    const generateKodeKelas = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const segments = [];
      for (let i = 0; i < 3; i++) {
        let segment = '';
        for (let j = 0; j < 3; j++) {
          segment += chars[Math.floor(Math.random() * chars.length)];
        }
        segments.push(segment);
      }
      return segments.join('-');
    };

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
      console.error('Database error creating kelas:', error);
      return NextResponse.json({ error: 'Failed to create kelas' }, { status: 400 });
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

  } catch (error: unknown) {
    console.error('Error in POST /api/kelas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}