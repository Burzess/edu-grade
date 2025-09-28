import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/kelas - Mendapatkan daftar kelas berdasarkan role user
 * - Guru: Mendapatkan kelas yang mereka buat
 * - Siswa: Mendapatkan kelas yang mereka ikuti
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Set auth token
    const token = authHeader.replace('Bearer ', '');
    supabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 400 }
      );
    }

    let kelasData;

    if (profile.role === 'guru') {
      // Guru: Ambil kelas yang mereka buat dengan jumlah siswa
      const { data, error } = await supabase
        .from('kelas_with_member_count')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch kelas data' },
          { status: 400 }
        );
      }

      kelasData = data;
    } else if (profile.role === 'siswa') {
      // Siswa: Ambil kelas yang mereka ikuti
      const { data, error } = await supabase
        .from('kelas_members')
        .select(`
          kelas_id,
          joined_at,
          kelas:kelas_id (
            id,
            nama_kelas,
            deskripsi,
            kode_kelas,
            created_at,
            profiles:created_by (
              full_name
            )
          )
        `)
        .eq('siswa_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch kelas data' },
          { status: 400 }
        );
      }

      // Transform data untuk siswa
      kelasData = data?.map(item => ({
        id: item.kelas?.id,
        nama_kelas: item.kelas?.nama_kelas,
        deskripsi: item.kelas?.deskripsi,
        kode_kelas: item.kelas?.kode_kelas,
        guru_name: item.kelas?.profiles?.full_name,
        joined_at: item.joined_at,
        created_at: item.kelas?.created_at
      }));
    }

    return NextResponse.json({ 
      success: true, 
      data: kelasData,
      role: profile.role 
    });

  } catch (error) {
    console.error('Error in GET /api/kelas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kelas - Membuat kelas baru (hanya guru)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/kelas - Creating new kelas...');
    
    // Use service role untuk bypass RLS sementara
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header using client-side supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Create client-side supabase untuk auth
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace('Bearer ', '');
    
    clientSupabase.auth.setSession({
      access_token: token,
      refresh_token: token,
    });

    // Get current user dari client supabase
    const { data: { user }, error: authError } = await clientSupabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Validate user is guru using service role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'guru') {
      console.error('❌ Profile error or not guru:', profileError, profile?.role);
      return NextResponse.json(
        { error: 'Only teachers can create classes' },
        { status: 403 }
      );
    }

    console.log('✅ User is guru, proceeding...');

    // Get request body
    const body = await request.json();
    const { nama_kelas, deskripsi } = body;
    
    console.log('📋 Request data:', { nama_kelas, deskripsi });

    // Validate required fields
    if (!nama_kelas || nama_kelas.trim() === '') {
      return NextResponse.json(
        { error: 'Nama kelas wajib diisi' },
        { status: 400 }
      );
    }

    // Insert new kelas dengan manual kode generation sebagai fallback
    console.log('🔄 Inserting kelas into database...');
    
    // Generate kode kelas manual sebagai fallback
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
        nama_kelas: nama_kelas.trim(),
        deskripsi: deskripsi?.trim() || null,
        kode_kelas: kodeKelas, // Manual generate
        created_by: user.id
      })
      .select(`
        *,
        profiles:created_by (
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to create kelas', 
          details: error.message,
          code: error.code,
          hint: error.hint 
        },
        { status: 400 }
      );
    }

    console.log('✅ Kelas created successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Kelas berhasil dibuat',
      data: {
        ...data,
        jumlah_siswa: 0,
        guru_name: data.profiles?.full_name
      }
    });

  } catch (error) {
    console.error('Error in POST /api/kelas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}