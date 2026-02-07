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
    console.log('🔄 GET /api/kelas - Starting request');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Get user from auth header
    const authHeader = request.headers.get('authorization');
    console.log('🔐 Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('❌ No authorization header');
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
    console.log('👤 User auth result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
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

    console.log('👥 Profile result:', { 
      profile, 
      profileError: profileError?.message 
    });

    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError);
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 400 }
      );
    }

    let kelasData: any[] = [];

    if (profile.role === 'guru') {
      console.log('👨‍🏫 Fetching kelas for guru:', user.id);
      
      // Try to get from view with is_active field
      let { data, error } = await supabase
        .from('kelas_with_member_count')
        .select('*, is_active')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      console.log('📊 View query result:', { 
        hasData: !!data, 
        dataLength: data?.length, 
        error: error?.message 
      });

      // If view doesn't have is_active field, fallback to direct table query
      if (error && error.message?.includes('is_active')) {
        console.log('⚠️ View missing is_active field, using fallback query');
        
        const { data: kelasRaw, error: kelasError } = await supabase
          .from('kelas')
          .select(`
            id,
            nama_kelas,
            kode_kelas,
            created_by,
            is_active,
            created_at,
            updated_at
          `)
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (kelasError) {
          console.error('❌ Direct kelas query failed:', kelasError);
          return NextResponse.json(
            { error: 'Failed to fetch kelas data', details: kelasError.message },
            { status: 400 }
          );
        }

        // Get member count for each kelas manually
        const kelasWithCount = await Promise.all(
          (kelasRaw || []).map(async (kelas) => {
            const { count } = await supabase
              .from('kelas_members')
              .select('*', { count: 'exact', head: true })
              .eq('kelas_id', kelas.id);

            return {
              ...kelas,
              jumlah_siswa: count || 0
            };
          })
        );

        data = kelasWithCount;
        error = null;
      }

      if (error) {
        console.error('❌ Final kelas query failed:', error);
        return NextResponse.json(
          { error: 'Failed to fetch kelas data', details: error.message },
          { status: 400 }
        );
      }

      kelasData = data || [];
    } else if (profile.role === 'siswa') {
      // Siswa: Ambil kelas yang mereka ikuti (hanya yang aktif)
      const { data, error } = await supabase
        .from('kelas_members')
        .select(`
          kelas_id,
          joined_at,
          kelas:kelas_id (
            id,
            nama_kelas,
            kode_kelas,
            is_active,
            created_at,
            profiles:created_by (
              full_name
            )
          )
        `)
        .eq('siswa_id', user.id)
        .eq('kelas.is_active', true)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('❌ Siswa kelas query failed:', error);
        return NextResponse.json(
          { error: 'Failed to fetch kelas data', details: error.message },
          { status: 400 }
        );
      }

      console.log('📊 Raw siswa kelas data:', { 
        dataCount: data?.length, 
        sampleItem: data?.[0] 
      });

      // Transform data untuk siswa dengan type assertion yang tepat
      kelasData = data?.map((item: any) => {
        const kelasInfo = item.kelas;
        const guruInfo = Array.isArray(kelasInfo?.profiles) ? kelasInfo.profiles[0] : kelasInfo?.profiles;
        
        const transformedItem = {
          id: kelasInfo?.id,
          nama_kelas: kelasInfo?.nama_kelas,
          kode_kelas: kelasInfo?.kode_kelas,
          is_active: kelasInfo?.is_active, // Include is_active field
          guru_name: guruInfo?.full_name,
          joined_at: item.joined_at,
          created_at: kelasInfo?.created_at
        };
        
        console.log('🔍 Transformed item:', {
          id: transformedItem.id,
          nama: transformedItem.nama_kelas,
          is_active: transformedItem.is_active,
          typeof_active: typeof transformedItem.is_active
        });
        
        return transformedItem;
      }) || [];
    }

    console.log('✅ Final result:', { 
      success: true, 
      dataCount: kelasData?.length, 
      role: profile.role 
    });

    return NextResponse.json({ 
      success: true, 
      data: kelasData,
      role: profile.role 
    });

  } catch (error) {
    console.error('❌ Error in GET /api/kelas:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kelas - Update kelas (nama dan status aktif)
 */
export async function PATCH(request: NextRequest) {
  try {
    console.log('🔄 PATCH /api/kelas - Updating kelas...');
    
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
        { error: 'Only teachers can update classes' },
        { status: 403 }
      );
    }

    console.log('✅ User is guru, proceeding...');

    // Get request body
    const body = await request.json();
    const { kelas_id, nama_kelas, is_active } = body;
    
    console.log('📋 Request data:', { kelas_id, nama_kelas, is_active });

    // Validate required fields
    if (!kelas_id) {
      return NextResponse.json(
        { error: 'Kelas ID wajib diisi' },
        { status: 400 }
      );
    }

    // Check if kelas exists and belongs to the teacher
    const { data: existingKelas, error: checkError } = await supabase
      .from('kelas')
      .select('id, nama_kelas, is_active')
      .eq('id', kelas_id)
      .eq('created_by', user.id)
      .single();

    if (checkError || !existingKelas) {
      console.error('❌ Kelas not found or not owned by user:', checkError);
      return NextResponse.json(
        { error: 'Kelas tidak ditemukan atau Anda tidak memiliki akses' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (nama_kelas !== undefined) {
      if (!nama_kelas || nama_kelas.trim() === '') {
        return NextResponse.json(
          { error: 'Nama kelas tidak boleh kosong' },
          { status: 400 }
        );
      }
      updateData.nama_kelas = nama_kelas.trim();
    }
    
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    console.log('📝 Updating kelas with data:', updateData);

    // Update kelas
    const { data, error } = await supabase
      .from('kelas')
      .update(updateData)
      .eq('id', kelas_id)
      .eq('created_by', user.id)
      .select(`
        id,
        nama_kelas,
        kode_kelas,
        is_active,
        created_at,
        updated_at,
        profiles:created_by (
          full_name
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to update kelas', 
          details: error.message
        },
        { status: 400 }
      );
    }

    console.log('✅ Kelas updated successfully:', data);

    return NextResponse.json({
      success: true,
      message: 'Kelas berhasil diperbarui',
      data: {
        ...data,
        guru_name: (data as any).profiles?.full_name || 'Unknown'
      }
    });

  } catch (error) {
    console.error('Error in PATCH /api/kelas:', error);
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
    const { nama_kelas } = body;
    
    console.log('📋 Request data:', { nama_kelas });

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
        kode_kelas: kodeKelas, // Manual generate
        created_by: user.id,
        is_active: true // Default aktif
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