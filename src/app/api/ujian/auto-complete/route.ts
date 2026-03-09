import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Auth check — only guru can trigger auto-complete
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
      console.error('❌ Error finding expired ujian:', findError)
      return NextResponse.json({ 
        success: false, 
        error: findError.message 
      }, { status: 500 })
    }

    if (!expiredUjian || expiredUjian.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expired ujian found',
        completed: []
      })
    }

    expiredUjian.forEach(ujian => {
    })

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
      console.error('❌ Error updating ujian status:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update ujian status' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully completed ${updatedUjian?.length || 0} expired ujian`,
      completed: updatedUjian || []
    })

  } catch (error: unknown) {
    console.error('❌ Unexpected error in auto-complete API:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET method untuk status check
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAuth.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
        error: 'Failed to check status' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      current_time: now,
      active_ujian_expiring_soon: soonExpired?.length || 0,
      ujian_details: soonExpired || []
    })

  } catch (error: unknown) {
    console.error('Error in status check:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
