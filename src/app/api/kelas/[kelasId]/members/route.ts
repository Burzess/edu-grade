import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/kelas/[kelasId]/members - Mendapatkan daftar anggota kelas (guru only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;
    
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

    // Validate user is guru and owns the kelas
    const { data: kelas, error: kelasError } = await supabase
      .from('kelas')
      .select('id, nama_kelas, created_by')
      .eq('id', kelasId)
      .eq('created_by', user.id)
      .single();

    if (kelasError || !kelas) {
      return NextResponse.json(
        { error: 'Kelas not found or access denied' },
        { status: 404 }
      );
    }

    // Get kelas members with siswa details
    const { data: members, error: membersError } = await supabase
      .from('kelas_members')
      .select(`
        id,
        joined_at,
        profiles:siswa_id (
          id,
          full_name,
          email
        )
      `)
      .eq('kelas_id', kelasId)
      .order('joined_at', { ascending: false });

    if (membersError) {
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 400 }
      );
    }

    // Transform data
    const transformedMembers = members?.map((member, index) => ({
      id: member.id,
      no: index + 1,
      siswa_id: (member.profiles as any)?.id,
      nama_siswa: (member.profiles as any)?.full_name,
      email: (member.profiles as any)?.email,
      tanggal_bergabung: member.joined_at
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        kelas: {
          id: kelas.id,
          nama_kelas: kelas.nama_kelas
        },
        members: transformedMembers,
        total_members: transformedMembers.length
      }
    });

  } catch (error) {
    console.error('Error in GET /api/kelas/[kelasId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kelas/[kelasId]/members - Mengeluarkan siswa dari kelas (guru only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;
    
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

    // Get request body
    const body = await request.json();
    const { siswa_id } = body;

    if (!siswa_id) {
      return NextResponse.json(
        { error: 'siswa_id is required' },
        { status: 400 }
      );
    }

    // Use database function untuk remove siswa
    const { data, error } = await supabase
      .rpc('remove_siswa_from_kelas', {
        p_kelas_id: kelasId,
        p_siswa_id: siswa_id,
        p_guru_id: user.id
      });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to remove siswa from kelas' },
        { status: 400 }
      );
    }

    // Parse result dari function
    const result = data;
    
    if (!result.success) {
      let status = 400;
      
      switch (result.error) {
        case 'UNAUTHORIZED':
          status = 403;
          break;
        case 'NOT_MEMBER':
          status = 404;
          break;
      }

      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: result.message 
        },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error in DELETE /api/kelas/[kelasId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}