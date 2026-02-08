import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/kelas/join - Siswa bergabung ke kelas menggunakan kode
 */
export async function POST(request: NextRequest) {
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

    // Validate user is siswa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'siswa') {
      return NextResponse.json(
        { error: 'Only students can join classes' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { kode_kelas } = body;

    // Validate kode kelas
    if (!kode_kelas || kode_kelas.trim() === '') {
      return NextResponse.json(
        { error: 'Kode kelas wajib diisi' },
        { status: 400 }
      );
    }

    // Clean dan normalize kode kelas
    const cleanKode = kode_kelas.trim().toLowerCase().replace(/\s+/g, '');
    
    // Validasi format kode kelas (xxx-xxx-xxx)
    const kodeRegex = /^[a-z0-9]{3}-[a-z0-9]{3}-[a-z0-9]{3}$/;
    if (!kodeRegex.test(cleanKode)) {
      return NextResponse.json(
        { error: 'Format kode kelas tidak valid. Contoh: k7b-p2m-z9x' },
        { status: 400 }
      );
    }

    console.log(`✅ User ${user.id} (${profile.role}) joining kelas with code: ${cleanKode}`);
    // Use database function untuk join kelas
    const { data, error } = await supabase
      .rpc('join_kelas_by_code', {
        p_kode_kelas: cleanKode,
        p_siswa_id: user.id
      });

    console.log('🔄 join_kelas_by_code result:', { data, error });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to join kelas' },
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

  } catch (error) {
    console.error('Error in POST /api/kelas/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}