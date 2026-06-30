import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '@/lib/api/parse-json-body';

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid('Format ID kelas tidak valid');

const deleteMemberSchema = z.object({
  siswa_id: z.string().uuid('Format ID siswa tidak valid'),
});

const addMembersSchema = z.object({
  siswa_ids: z.array(z.string().uuid('Format ID siswa tidak valid')),
});

/**
 * GET /api/kelas/[kelasId]/members - Mendapatkan daftar anggota kelas (guru only)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;

    const kelasIdParsed = uuidSchema.safeParse(kelasId);
    if (!kelasIdParsed.success) {
      return NextResponse.json({ error: 'ID kelas tidak valid' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
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
        { error: 'Kelas tidak ditemukan atau akses ditolak' },
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
        { error: 'Gagal mengambil data anggota' },
        { status: 400 }
      );
    }

    // Transform data
    const transformedMembers = members?.map((member, index) => {
      const profiles = member.profiles as unknown as { id: string; full_name: string; email: string } | null;
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

  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kelas/[kelasId]/members - Menambahkan siswa ke kelas (admin/guru only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;
    const kelasId = resolvedParams.kelasId;

    const kelasIdParsed = uuidSchema.safeParse(kelasId);
    if (!kelasIdParsed.success) {
      return NextResponse.json({ error: 'ID kelas tidak valid' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { data: kelas, error: kelasError } = await supabase
      .from('kelas')
      .select('id')
      .eq('id', kelasId)
      .single();

    if (kelasError || !kelas) {
        return NextResponse.json(
          { error: 'Kelas tidak ditemukan' },
          { status: 404 }
        );
    }

    const parsed = await parseJsonBody(request, addMembersSchema);
    if ('response' in parsed) return parsed.response;
    const { siswa_ids } = parsed.data;

    if (siswa_ids.length === 0) {
        return NextResponse.json(
            { error: 'Pilih setidaknya satu siswa' },
            { status: 400 }
        );
    }

    const insertData = siswa_ids.map((id) => ({
        kelas_id: kelasId,
        siswa_id: id,
    }));

    const { error } = await supabase
        .from('kelas_members')
        .insert(insertData);

    if (error) {
        if (error.code === '23505') {
             return NextResponse.json(
                { error: 'Satu atau lebih siswa sudah ada di kelas ini' },
                { status: 400 }
             );
        }
        return NextResponse.json(
          { error: 'Gagal menambahkan siswa ke kelas' },
          { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Berhasil menambahkan siswa ke kelas',
    });

  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
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
      return NextResponse.json({ error: 'ID kelas tidak valid' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const parsed = await parseJsonBody(request, deleteMemberSchema);
    if ('response' in parsed) return parsed.response;
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
        { error: 'Gagal mengeluarkan siswa dari kelas' },
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

  } catch (_error: unknown) {
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
