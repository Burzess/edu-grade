// Debug script untuk troubleshoot masalah update score
import { createClient } from '@/lib/supabase/client'

export async function debugScoreUpdate(jawabanId: string) {
    const supabase = createClient()
    
    console.log('🔍 Debug Score Update - Starting diagnosis...')
    console.log('📋 Jawaban ID:', jawabanId)
    
    try {
        // 1. Cek apakah jawaban ada
        console.log('\n1️⃣ Checking if jawaban exists...')
        const { data: jawaban, error: jawabanError } = await supabase
            .from('jawaban_siswa')
            .select('*')
            .eq('id', jawabanId)
            .maybeSingle()
        
        if (jawabanError) {
            console.error('❌ Error fetching jawaban:', jawabanError)
            return { success: false, error: jawabanError }
        }
        
        if (!jawaban) {
            console.error('❌ Jawaban not found with ID:', jawabanId)
            return { success: false, error: 'Jawaban tidak ditemukan' }
        }
        
        console.log('✅ Jawaban found:', jawaban)
        
        // 2. Cek user authentication
        console.log('\n2️⃣ Checking user auth...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
            console.error('❌ User authentication error:', userError)
            return { success: false, error: 'User tidak terautentikasi' }
        }
        
        console.log('✅ User authenticated:', user.id)
        
        // 3. Cek apakah user adalah guru yang membuat ujian
        console.log('\n3️⃣ Checking ujian ownership...')
        const { data: ujian, error: ujianError } = await supabase
            .from('ujian')
            .select('id, name, created_by')
            .eq('id', jawaban.ujian_id)
            .eq('created_by', user.id)
            .maybeSingle()
        
        if (ujianError) {
            console.error('❌ Error fetching ujian:', ujianError)
            return { success: false, error: ujianError }
        }
        
        if (!ujian) {
            console.error('❌ Ujian not found or user is not the owner')
            return { success: false, error: 'Ujian tidak ditemukan atau bukan milik user' }
        }
        
        console.log('✅ Ujian ownership verified:', ujian)
        
        // 4. Test update with dummy data
        console.log('\n4️⃣ Testing update operation...')
        const testScore = 85
        const testFeedback = 'Test feedback dari debug script'
        
        const { data: updateResult, error: updateError } = await supabase
            .from('jawaban_siswa')
            .update({
                score: testScore,
                ai_feedback: testFeedback,
                updated_at: new Date().toISOString()
            })
            .eq('id', jawabanId)
            .select()
        
        if (updateError) {
            console.error('❌ Update error:', updateError)
            return { success: false, error: updateError }
        }
        
        if (!updateResult || updateResult.length === 0) {
            console.error('❌ Update returned no data')
            return { success: false, error: 'Update tidak menghasilkan data' }
        }
        
        console.log('✅ Update successful:', updateResult[0])
        
        return { 
            success: true, 
            data: {
                jawaban,
                user,
                ujian,
                updateResult: updateResult[0]
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected error in debug:', error)
        return { success: false, error }
    }
}

// Helper function untuk memanggil debug dari browser console
export function addDebugToWindow() {
    if (typeof window !== 'undefined') {
        (window as any).debugScoreUpdate = debugScoreUpdate
        console.log('🔧 Debug function added to window.debugScoreUpdate(jawabanId)')
    }
}