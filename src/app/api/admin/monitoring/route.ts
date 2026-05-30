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
    const type = searchParams.get('type') || 'all'
    const severity = searchParams.get('severity') || 'all'
    const offset = (page - 1) * limit

    const allowedTypes = new Set([
      'tab_switch', 'before_unload', 'text_selection', 'right_click',
      'key_combination', 'split_screen', 'viewport_change',
      'orientation_suspicious', 'screenshot_attempt'
    ])
    const allowedSeverity = new Set(['info', 'warning', 'medium', 'high', 'critical'])

    const typeFilter = allowedTypes.has(type) ? type : 'all'
    const severityFilter = allowedSeverity.has(severity) ? severity : 'all'

    // Main query
    let query = adminSupabase
      .from('security_events')
      .select('id, event_type, severity, user_id, ujian_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (typeFilter !== 'all') {
      query = query.eq('event_type', typeFilter)
    }
    if (severityFilter !== 'all') {
      query = query.eq('severity', severityFilter)
    }
    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&')

      // Search user names from profiles table
      const { data: matchedProfiles } = await adminSupabase
        .from('profiles')
        .select('id')
        .ilike('full_name', `%${sanitized}%`)

      const matchedUserIds = (matchedProfiles ?? []).map(p => p.id)

      if (matchedUserIds.length > 0) {
        query = query.or(`event_type.ilike.%${sanitized}%,user_id.in.(${matchedUserIds.join(',')})`)
      } else {
        query = query.ilike('event_type', `%${sanitized}%`)
      }
    }

    const { data, count: filteredCount, error: queryError } = await query

    if (queryError) {
      logger.error('Error querying security events:', queryError)
      return NextResponse.json({ success: false, error: 'Gagal mengambil data events' }, { status: 500 })
    }

    const events = data ?? []

    // Resolve user names and ujian names from IDs
    const userIds = [...new Set(events.map(e => e.user_id).filter(Boolean))] as string[]
    const ujianIds = [...new Set(events.map(e => e.ujian_id).filter(Boolean))] as string[]

    const [profilesResult, ujianResult] = await Promise.all([
      userIds.length > 0
        ? adminSupabase.from('profiles').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      ujianIds.length > 0
        ? adminSupabase.from('ujian').select('id, name').in('id', ujianIds)
        : Promise.resolve({ data: [] }),
    ])

    const profileMap = new Map((profilesResult.data ?? []).map(p => [p.id, p.full_name]))
    const ujianMap = new Map((ujianResult.data ?? []).map(u => [u.id, u.name]))

    const enrichedEvents = events.map(event => ({
      ...event,
      profiles: event.user_id && profileMap.has(event.user_id)
        ? { full_name: profileMap.get(event.user_id)! }
        : null,
      ujian: event.ujian_id && ujianMap.has(event.ujian_id)
        ? { name: ujianMap.get(event.ujian_id)! }
        : null,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedEvents,
      count: filteredCount ?? 0,
      page,
      limit,
      totalPages: Math.ceil((filteredCount ?? 0) / limit),
    })
  } catch (err: unknown) {
    logger.error('Error in GET /api/admin/monitoring:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
