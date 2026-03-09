import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid('Invalid kelas ID format')

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ kelasId: string }> }
) {
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

        // Check if user is siswa
        const { data: userProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userProfile?.role !== 'siswa') {
            return NextResponse.json({
                success: false,
                error: 'Only siswa can access this endpoint'
            }, { status: 403 })
        }

        // Await params before using its properties
        const { kelasId } = await params

        const kelasIdParsed = uuidSchema.safeParse(kelasId)
        if (!kelasIdParsed.success) {
            return NextResponse.json({
                success: false,
                error: 'Invalid kelas ID'
            }, { status: 400 })
        }

        // Check if siswa is member of this kelas
        const { data: membershipData, error: membershipError } = await supabase
            .from('kelas_members')
            .select('joined_at')
            .eq('siswa_id', user.id)
            .eq('kelas_id', kelasId)
            .single()

        if (membershipError || !membershipData) {
            return NextResponse.json({
                success: false,
                error: 'Kelas not found or you are not a member of this kelas'
            }, { status: 404 })
        }

        // Get kelas detail
        const { data: kelasData, error: kelasError } = await supabase
            .from('kelas')
            .select(`
                id,
                nama_kelas,
                kode_kelas,
                created_by
            `)
            .eq('id', kelasId)
            .single()

        if (kelasError || !kelasData) {
            return NextResponse.json({
                success: false,
                error: 'Kelas not found'
            }, { status: 404 })
        }

        // Get guru information separately
        let guruName = 'Tidak diketahui'
        if (kelasData.created_by) {
            const { data: guruProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', kelasData.created_by)
                .single()
            
            guruName = guruProfile?.full_name || 'Tidak diketahui'
        }

        // Format response
        const kelasDetail = {
            id: kelasData.id,
            nama_kelas: kelasData.nama_kelas,
            kode_kelas: kelasData.kode_kelas,
            guru_name: guruName,
            joined_at: membershipData.joined_at
        }

        return NextResponse.json({
            success: true,
            data: kelasDetail
        })

    } catch (error: unknown) {
        console.error('Error in GET /api/kelas/[kelasId]:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error'
            },
            { status: 500 }
        )
    }
}