import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Tidak terautentikasi' 
      }, { status: 401 })
    }

    // Check if user is guru
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'guru' && userProfile?.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Hanya guru atau admin yang dapat mengakses endpoint ini'
      }, { status: 403 })
    }

    // Get kelas created by this guru
    const { data: kelasList, error: kelasError } = await supabase
      .from('kelas')
      .select(`
        id,
        nama_kelas,
        kode_kelas,
        guru_id,
        created_at
      `)
      .order('nama_kelas', { ascending: true })

    if (kelasError) {
      return NextResponse.json({
        success: false,
        error: 'Gagal mengambil data kelas'
      }, { status: 500 })
    }

    // Get member count for each kelas
    const kelasIds = kelasList?.map(k => k.id) || []
    const memberCounts: { [key: string]: number } = {}

    if (kelasIds.length > 0) {
      const { data: memberData } = await supabase
        .from('kelas_members')
        .select('kelas_id')
        .in('kelas_id', kelasIds)

      // Count members per kelas
      memberData?.forEach((member: { kelas_id: string }) => {
        memberCounts[member.kelas_id] = (memberCounts[member.kelas_id] || 0) + 1
      })
    }

    // Format response with member count
    const kelasWithCount = (kelasList || []).map(kelas => ({
      ...kelas,
      member_count: memberCounts[kelas.id] || 0
    }))

    return NextResponse.json({
      success: true,
      data: kelasWithCount
    })

  } catch (_error: unknown) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan pada server' 
      },
      { status: 500 }
    )
  }
}
