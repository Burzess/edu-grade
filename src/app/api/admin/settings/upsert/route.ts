import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const settingSchema = z.object({
  setting_key: z.string().min(3).max(120),
  value: z.string().min(2).max(8000),
  description: z.string().max(255).optional(),
})

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = settingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validasi gagal' }, { status: 400 })
    }

    let parsedValue: Record<string, unknown>
    try {
      const rawValue = JSON.parse(parsed.data.value)
      if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
        throw new Error('Format JSON harus berupa object')
      }
      parsedValue = rawValue as Record<string, unknown>
    } catch {
      return NextResponse.json({ success: false, error: 'Format JSON tidak valid' }, { status: 400 })
    }

    const adminSupabase = await createAdminClient()
    const { error } = await adminSupabase
      .from('system_settings')
      .upsert({
        setting_key: parsed.data.setting_key,
        value: parsedValue,
        description: parsed.data.description || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' })

    if (error) {
      logger.error('Failed to upsert system setting:', error)
      return NextResponse.json({ success: false, error: 'Gagal menyimpan pengaturan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    logger.error('Error in POST /api/admin/settings/upsert:', err)
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
