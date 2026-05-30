import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { visibilityUpdateSchema } from '@/lib/schemas/visibility-schema'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: ujianId } = await params
    const supabase = await createClient()

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Autentikasi diperlukan' },
        { status: 401 }
      )
    }

    // Query ujian visibility setting
    const { data: ujian, error: ujianError } = await supabase
      .from('ujian')
      .select('id, visibility_setting, updated_at')
      .eq('id', ujianId)
      .single()

    if (ujianError || !ujian) {
      // Fallback: if visibility_setting column doesn't exist yet, try without it
      const { data: ujianFallback, error: fallbackError } = await supabase
        .from('ujian')
        .select('id, updated_at')
        .eq('id', ujianId)
        .single()

      if (fallbackError || !ujianFallback) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Ujian tidak ditemukan' },
          { status: 404 }
        )
      }

      // Column doesn't exist yet, return default
      return NextResponse.json({
        id: ujianFallback.id,
        visibility_setting: 'visible',
        updated_at: ujianFallback.updated_at,
      })
    }

    return NextResponse.json({
      id: ujian.id,
      visibility_setting: ujian.visibility_setting,
      updated_at: ujian.updated_at,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Gagal memuat pengaturan' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: ujianId } = await params
    const supabase = await createClient()

    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Autentikasi diperlukan' },
        { status: 401 }
      )
    }

    // Get user profile role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Anda tidak memiliki akses untuk mengubah pengaturan ini' },
        { status: 403 }
      )
    }

    // Siswa cannot access this endpoint
    if (profile.role !== 'guru') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Anda tidak memiliki akses untuk mengubah pengaturan ini' },
        { status: 403 }
      )
    }

    // Check ujian exists and ownership
    const { data: ujian, error: ujianError } = await supabase
      .from('ujian')
      .select('id, created_by')
      .eq('id', ujianId)
      .single()

    if (ujianError || !ujian) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Ujian tidak ditemukan' },
        { status: 404 }
      )
    }

    // Ownership check
    if (ujian.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Anda tidak memiliki akses untuk mengubah pengaturan ini' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body: unknown = await request.json()
    const validation = visibilityUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: "visibility_setting harus 'visible' atau 'hidden'",
          field: 'visibility_setting',
          allowed: ['visible', 'hidden'],
        },
        { status: 400 }
      )
    }

    // Update visibility_setting in database
    const { data: updated, error: updateError } = await supabase
      .from('ujian')
      .update({ visibility_setting: validation.data.visibility_setting })
      .eq('id', ujianId)
      .select('id, visibility_setting, updated_at')
      .single()

    if (updateError || !updated) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Gagal menyimpan pengaturan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: updated.id,
      visibility_setting: updated.visibility_setting,
      updated_at: updated.updated_at,
    })
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Gagal menyimpan pengaturan' },
      { status: 500 }
    )
  }
}
