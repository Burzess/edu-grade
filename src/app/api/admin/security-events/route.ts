import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { parseJsonBody } from '@/lib/api/parse-json-body'
import { securityEventCreateSchema } from './_schema'
import type { SecurityEventCreatePayload } from './_schema'
import { adminWriteLimiter } from '@/lib/rate-limit'
import { checkRateLimit } from '@/lib/api/check-rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/security-events - allow authenticated users to create their own security events
 * GET /api/admin/security-events - admin-only: list events
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    // Rate limit writes
    const limited = checkRateLimit(adminWriteLimiter(user.id))
    if (limited) return limited

    const parsed = await parseJsonBody<SecurityEventCreatePayload>(request, securityEventCreateSchema)
    if ('response' in parsed) return parsed.response
    const { event_type, ujian_id, severity, details, source } = parsed.data

    // Use admin client for insert to bypass RLS policy (user already authenticated above)
    const adminSupabase = await createAdminClient()
    const { data: inserted, error } = await adminSupabase
      .from('security_events')
      .insert({
        user_id: user.id,
        ujian_id: ujian_id ?? null,
        event_type: event_type,
        severity: severity ?? null,
        details: details ?? null,
        source: source ?? (request.headers.get('x-source') || 'client')
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to insert security event:', error)
      return NextResponse.json({ success: false, error: 'Gagal mencatat event' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: inserted })

  } catch (err: unknown) {
    logger.error('Error in POST /api/admin/security-events:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const { data: events, error } = await adminSupabase
      .from('security_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching security events:', error)
      return NextResponse.json({ success: false, error: 'Gagal mengambil data events' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: events })

  } catch (err: unknown) {
    logger.error('Error in GET /api/admin/security-events:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
