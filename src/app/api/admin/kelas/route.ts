import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role untuk bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/kelas - List all kelas for debugging
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching all kelas for debugging...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all kelas with details
    const { data: kelasList, error } = await supabase
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
      console.error('❌ Error fetching kelas:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log(`✅ Found ${kelasList?.length || 0} kelas`);

    return NextResponse.json({
      success: true,
      data: kelasList,
      count: kelasList?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in GET /api/admin/kelas:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/kelas - Create test kelas for debugging
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Creating test kelas...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await request.json();
    const { nama_kelas = 'Test Kelas Debug', deskripsi = 'Kelas untuk testing join', guru_id } = body;

    // Generate simple kode kelas
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

    // Find a guru user if not provided
    let finalGuruId = guru_id;
    if (!finalGuruId) {
      const { data: guruProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'guru')
        .limit(1)
        .single();
      
      finalGuruId = guruProfile?.id || '00000000-0000-0000-0000-000000000001';
    }

    const { data: newKelas, error } = await supabase
      .from('kelas')
      .insert({
        nama_kelas: nama_kelas,
        deskripsi: deskripsi,
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
      console.error('❌ Error creating test kelas:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log('✅ Test kelas created:', newKelas);

    return NextResponse.json({
      success: true,
      message: 'Test kelas berhasil dibuat',
      data: newKelas,
      kode_kelas: kodeKelas,
      instructions: `Use kode_kelas "${kodeKelas}" untuk test join kelas`
    });

  } catch (error) {
    console.error('❌ Error in POST /api/admin/kelas:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}