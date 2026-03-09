import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid('Invalid kelas ID format');

const deleteMemberSchema = z.object({
  siswa_id: z.string().uuid('Invalid siswa ID format'),
});

/**
 * GET /api/kelas/[kelasId]/members - Mendapatkan daftar anggota kelas (guru only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;

    const kelasIdParsed = uuidSchema.safeParse(kelasId);
    if (!kelasIdParsed.success) {
      return NextResponse.json({ error: 'Invalid kelas ID' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    const transformedMembers = members?.map((member, index) => {
      const profiles = member.profiles as Record<string, unknown> | null;
      return {
        id: member.id,
        no: index + 1,
        siswa_id: profiles?.id,
        nama_siswa: profiles?.full_name,
        email: profiles?.email,
        tanggal_bergabung: member.joined_at
      };
    }) || [];

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

  } catch (error: unknown) {
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
    const supabase = await createClient();
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;

    const kelasIdParsed = uuidSchema.safeParse(kelasId);
    if (!kelasIdParsed.success) {
      return NextResponse.json({ error: 'Invalid kelas ID' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = deleteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'siswa_id is required and must be a valid UUID' },
        { status: 400 }
      );
    }

    const { siswa_id } = parsed.data;

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

  } catch (error: unknown) {
    console.error('Error in DELETE /api/kelas/[kelasId]/members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}