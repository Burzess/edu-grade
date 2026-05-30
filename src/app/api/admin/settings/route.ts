import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const adminSupabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 10
    const offset = (page - 1) * limit

    const { data, count: totalCount } = await adminSupabase
      .from('system_settings')
      .select('setting_key, value, description, updated_by, updated_at', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const settings = data ?? []

    return NextResponse.json({
      success: true,
      data: settings,
      count: totalCount ?? 0,
      page,
      limit,
      totalPages: Math.ceil((totalCount ?? 0) / limit),
    })
  } catch (err: unknown) {
    logger.error('Error in GET /api/admin/settings:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
