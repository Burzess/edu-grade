import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(_request: NextRequest) {
  try {
    // Auth check — only guru can trigger auto-complete
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const now = new Date().toISOString()
    
    // Find active ujian yang sudah melewati end_time
    const { data: expiredUjian, error: findError } = await supabase
      .from('ujian')
      .select('id, name, end_time, created_by')
      .eq('status', 'active')
      .not('end_time', 'is', null)
      .lt('end_time', now)

    if (findError) {
      return NextResponse.json({ 
        success: false, 
        error: findError.message 
      }, { status: 500 })
    }

    if (!expiredUjian || expiredUjian.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Tidak ditemukan ujian yang kedaluwarsa',
        completed: []
      })
    }

    // Update status menjadi completed
    const ujianIds = expiredUjian.map(u => u.id)
    const { data: updatedUjian, error: updateError } = await supabase
      .from('ujian')
      .update({ 
        status: 'completed',
        updated_at: now
      })
      .in('id', ujianIds)
      .select('id, name, status, end_time')

    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gagal memperbarui status ujian' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Berhasil menyelesaikan ${updatedUjian?.length || 0} ujian yang kedaluwarsa`,
      completed: updatedUjian || []
    })

  } catch (_error: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan pada server' 
    }, { status: 500 })
  }
}

// GET method untuk status check
export async function GET(_request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru' && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const supabase = await createAdminClient()
    const now = new Date().toISOString()
    
    // Count active ujian yang akan expired dalam 1 jam
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    const { data: soonExpired, error } = await supabase
      .from('ujian')
      .select('id, name, end_time')
      .eq('status', 'active')
      .not('end_time', 'is', null)
      .gte('end_time', now)
      .lte('end_time', oneHourFromNow)

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Gagal memeriksa status' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      current_time: now,
      active_ujian_expiring_soon: soonExpired?.length || 0,
      ujian_details: soonExpired || []
    })

  } catch (_error: unknown) {
    return NextResponse.json({ 
      success: false, 
      error: 'Terjadi kesalahan pada server' 
    }, { status: 500 })
  }
}
