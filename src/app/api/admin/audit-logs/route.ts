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
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)))
    const search = searchParams.get('q')?.trim() || ''
    const offset = (page - 1) * limit

    // Stats
    const last24Hours = new Date()
    last24Hours.setHours(last24Hours.getHours() - 24)

    const [totalResult, last24hResult] = await Promise.all([
      adminSupabase.from('audit_logs').select('id', { count: 'exact', head: true }),
      adminSupabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last24Hours.toISOString()),
    ])

    // Main query
    let query = adminSupabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, actor_id, actor_role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`action.ilike.%${sanitized}%,entity_type.ilike.%${sanitized}%`)
    }

    const { data, count: filteredCount } = await query
    const logs = data ?? []

    return NextResponse.json({
      success: true,
      data: logs,
      count: filteredCount ?? 0,
      stats: {
        total: totalResult.count ?? 0,
        last24h: last24hResult.count ?? 0,
      },
      page,
      limit,
      totalPages: Math.ceil((filteredCount ?? 0) / limit),
    })
  } catch (err: unknown) {
    logger.error('Error in GET /api/admin/audit-logs:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
