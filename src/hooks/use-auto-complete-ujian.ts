import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Hook untuk auto-complete ujian yang sudah melewati end_time
export function useAutoCompleteUjian() {
    const checkAndCompleteExpiredUjian = async () => {
        try {
            console.log('🔍 Checking for expired ujian to auto-complete...')
            
            const now = new Date().toISOString()
            
            // Find active ujian yang sudah melewati end_time
            const { data: expiredUjian, error: findError } = await supabase
                .from('ujian')
                .select('id, name, end_time')
                .eq('status', 'active')
                .not('end_time', 'is', null)
                .lt('end_time', now)

            if (findError) {
                console.error('❌ Error finding expired ujian:', findError)
                return
            }

            if (!expiredUjian || expiredUjian.length === 0) {
                console.log('✅ No expired ujian found')
                return
            }

            console.log('📋 Found expired ujian:', expiredUjian.length, 'items')
            expiredUjian.forEach(ujian => {
                console.log(`  - ${ujian.name} (ended: ${ujian.end_time})`)
            })

            // Update status menjadi completed
            const ujianIds = expiredUjian.map(u => u.id)
            const { data: updatedUjian, error: updateError } = await supabase
                .from('ujian')
                .update({ 
                    status: 'completed',
                    updated_at: now
                })
                .in('id', ujianIds)
                .select('id, name, status')

            if (updateError) {
                console.error('❌ Error updating ujian status:', updateError)
                return
            }

            console.log('✅ Auto-completed ujian:', updatedUjian?.length || 0, 'items')
            updatedUjian?.forEach(ujian => {
                console.log(`  ✓ ${ujian.name} → ${ujian.status}`)
            })

            return updatedUjian

        } catch (error) {
            console.error('❌ Unexpected error in auto-complete:', error)
        }
    }

    return {
        checkAndCompleteExpiredUjian
    }
}

// Service untuk running auto-complete secara berkala
export class UjianAutoCompleteService {
    private intervalId: NodeJS.Timeout | null = null
    private isRunning = false

    start(intervalMinutes = 1) {
        if (this.isRunning) {
            console.log('⚠️ Auto-complete service already running')
            return
        }

        const { checkAndCompleteExpiredUjian } = useAutoCompleteUjian()
        
        // Run immediately
        checkAndCompleteExpiredUjian()
        
        // Then run periodically
        this.intervalId = setInterval(() => {
            checkAndCompleteExpiredUjian()
        }, intervalMinutes * 60 * 1000)
        
        this.isRunning = true
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
        this.isRunning = false
        console.log('🛑 Ujian auto-complete service stopped')
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            intervalId: this.intervalId
        }
    }
}

// Global instance
export const ujianAutoCompleteService = new UjianAutoCompleteService()
