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
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('q')?.trim() || ''
    const role = searchParams.get('role') || 'all'
    const offset = (page - 1) * limit

    // Stats queries
    const [totalResult, guruResult, siswaResult, adminResult] = await Promise.all([
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'guru'),
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'siswa'),
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
    ])

    // Main query
    let query = adminSupabase
      .from('profiles')
      .select('id, email, full_name, role, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (role !== 'all' && ['admin', 'guru', 'siswa'].includes(role)) {
      query = query.eq('role', role)
    }

    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`)
    }

    const { data, count: filteredCount } = await query
    const profiles = data ?? []

    // Fetch auth user data (ban status, last login) in chunks
    const authUsers: Record<string, { banned_until: string | null; last_sign_in_at: string | null }> = {}
    if (profiles.length > 0) {
      const chunkSize = 5
      for (let i = 0; i < profiles.length; i += chunkSize) {
        const chunk = profiles.slice(i, i + chunkSize)
        const results = await Promise.all(
          chunk.map(p => adminSupabase.auth.admin.getUserById(p.id))
        )
        for (const { data: userData } of results) {
          if (userData?.user) {
            const u = userData.user as unknown as {
              id: string
              banned_until?: string | null
              last_sign_in_at?: string | null
            }
            authUsers[u.id] = {
              banned_until: u.banned_until ?? null,
              last_sign_in_at: u.last_sign_in_at ?? null,
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: profiles,
      authUsers,
      count: filteredCount ?? 0,
      stats: {
        total: totalResult.count ?? 0,
        guru: guruResult.count ?? 0,
        siswa: siswaResult.count ?? 0,
        admin: adminResult.count ?? 0,
      },
      page,
      limit,
      totalPages: Math.ceil((filteredCount ?? 0) / limit),
    })
  } catch (err: unknown) {
    logger.error('Error in GET /api/admin/users:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
