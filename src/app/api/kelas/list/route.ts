import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Check if user is guru
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'guru') {
      return NextResponse.json({
        success: false,
        error: 'Only guru can access this endpoint'
      }, { status: 403 })
    }

    // Get kelas created by this guru
    const { data: kelasList, error: kelasError } = await supabase
      .from('kelas')
      .select(`
        id,
        nama_kelas,
        deskripsi,
        kode_kelas,
        created_at
      `)
      .eq('created_by', user.id)
      .order('nama_kelas', { ascending: true })

    if (kelasError) {
      console.error('Error fetching kelas:', kelasError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch kelas'
      }, { status: 500 })
    }

    // Get member count for each kelas
    const kelasIds = kelasList?.map(k => k.id) || []
    let memberCounts: { [key: string]: number } = {}

    if (kelasIds.length > 0) {
      const { data: memberData } = await supabase
        .from('kelas_members')
        .select('kelas_id')
        .in('kelas_id', kelasIds)

      // Count members per kelas
      memberData?.forEach((member: any) => {
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

  } catch (error) {
    console.error('Error in GET /api/kelas/list:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}