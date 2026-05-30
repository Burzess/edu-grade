import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid('Format ID kelas tidak valid')

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ kelasId: string }> }
) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({
                success: false,
                error: 'Tidak terautentikasi'
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
                error: 'Hanya siswa yang dapat mengakses endpoint ini'
            }, { status: 403 })
        }

        // Await params before using its properties
        const { kelasId } = await params

        const kelasIdParsed = uuidSchema.safeParse(kelasId)
        if (!kelasIdParsed.success) {
            return NextResponse.json({
                success: false,
                error: 'ID kelas tidak valid'
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
                error: 'Kelas tidak ditemukan atau Anda bukan anggota kelas ini'
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
                error: 'Kelas tidak ditemukan'
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

    } catch (_error: unknown) {
        return NextResponse.json(
            {
                success: false,
                error: 'Terjadi kesalahan pada server'
            },
            { status: 500 }
        )
    }
}
