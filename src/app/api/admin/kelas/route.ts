import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/kelas - List all kelas (guru only, auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      console.error('Error fetching kelas:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch kelas' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: kelasList,
      count: kelasList?.length || 0
    });

  } catch (error: unknown) {
    console.error('Error in GET /api/admin/kelas:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/kelas - Create test kelas (guru only, auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { nama_kelas, guru_id } = body as Record<string, unknown>;

    const generateKode = () => {
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

    const kodeKelas = generateKode();

    let finalGuruId = typeof guru_id === 'string' ? guru_id : undefined;
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
      return NextResponse.json({ error: 'No guru found' }, { status: 400 });
    }

    const { data: newKelas, error } = await adminSupabase
      .from('kelas')
      .insert({
        nama_kelas: typeof nama_kelas === 'string' ? nama_kelas : 'Test Kelas Debug',
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
      console.error('Error creating test kelas:', error);
      return NextResponse.json({ success: false, error: 'Failed to create kelas' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test kelas berhasil dibuat',
      data: newKelas,
      kode_kelas: kodeKelas
    });

  } catch (error: unknown) {
    console.error('Error in POST /api/admin/kelas:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}