'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface GradingStatus {
  jawabanId: string
  status: 'PENDING' | 'GRADED' | 'ERROR'
  score: number | null
  feedback: string | null
}

/**
 * Hook untuk polling status penilaian AI (Tahap 4: Asynchronous UX)
 * 
 * Melakukan auto-refetch setiap 5 detik untuk mendeteksi perubahan status
 * dari PENDING ke GRADED setelah background job selesai.
 */
export function useGradingStatus(jawabanId: string | null, enabled: boolean = true) {

  return useQuery({
    queryKey: ['grading-status', jawabanId],
    queryFn: async (): Promise<GradingStatus> => {
      if (!jawabanId) {
        throw new Error('Jawaban ID is required')
      }

      const { data, error } = await supabase
        .from('jawaban_siswa')
        .select('id, score, ai_feedback')
        .eq('id', jawabanId)
        .single()

      if (error || !data) {
        throw new Error('Failed to fetch grading status')
      }

      // Tentukan status berdasarkan score dan feedback
      let status: GradingStatus['status'] = 'PENDING'
      
      if (data.score !== null) {
        status = 'GRADED'
      } else if (data.ai_feedback && data.ai_feedback.includes('PENDING')) {
        status = 'PENDING'
      } else if (data.ai_feedback && data.ai_feedback.includes('error')) {
        status = 'ERROR'
      }

      return {
        jawabanId: data.id,
        status,
        score: data.score,
        feedback: data.ai_feedback
      }
    },
    enabled: enabled && !!jawabanId,
    refetchInterval: (query) => {
      // Stop polling jika sudah selesai atau error
      if (query.state.data?.status === 'GRADED' || query.state.data?.status === 'ERROR') {
        return false
      }
      // Polling setiap 5 detik untuk status PENDING
      return 5000
    },
    refetchIntervalInBackground: false, // Jangan polling saat tab tidak aktif
    staleTime: 0 // Always fetch fresh data
  })
}

/**
 * Hook untuk polling multiple jawaban sekaligus (untuk batch grading)
 */
export function useBatchGradingStatus(jawabanIds: string[], enabled: boolean = true) {

  return useQuery({
    queryKey: ['batch-grading-status', ...jawabanIds],
    queryFn: async (): Promise<GradingStatus[]> => {
      if (jawabanIds.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('jawaban_siswa')
        .select('id, score, ai_feedback')
        .in('id', jawabanIds)

      if (error || !data) {
        throw new Error('Failed to fetch batch grading status')
      }

      return data.map(item => {
        let status: GradingStatus['status'] = 'PENDING'
        
        if (item.score !== null) {
          status = 'GRADED'
        } else if (item.ai_feedback && item.ai_feedback.includes('PENDING')) {
          status = 'PENDING'
        } else if (item.ai_feedback && item.ai_feedback.includes('error')) {
          status = 'ERROR'
        }

        return {
          jawabanId: item.id,
          status,
          score: item.score,
          feedback: item.ai_feedback
        }
      })
    },
    enabled: enabled && jawabanIds.length > 0,
    refetchInterval: (query) => {
      // Stop polling jika semua sudah selesai
      const allCompleted = query.state.data?.every(
        item => item.status === 'GRADED' || item.status === 'ERROR'
      )
      
      if (allCompleted) {
        return false
      }
      
      return 5000
    },
    refetchIntervalInBackground: false,
    staleTime: 0
  })
}
