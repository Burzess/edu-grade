// EMERGENCY DISABLED - File ini temporarily disabled untuk mencegah infinite requests
// Semua hooks di file ini di-disable untuk mengatasi masalah 21,000 requests dalam 2 menit

import { useMutation } from '@tanstack/react-query'

// Hook untuk optimized ujian status - EMERGENCY DISABLED
export function useOptimizedUjianStatus(ujianId?: string) {
  console.log('useOptimizedUjianStatus: DISABLED to prevent infinite requests')
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
  }
}

// Hook untuk optimized ujian status checker - EMERGENCY DISABLED
export function useOptimizedUjianStatusChecker() {
  console.log('useOptimizedUjianStatusChecker: DISABLED to prevent infinite requests')
  return useMutation({
    mutationFn: async () => {
      return null // No-op
    }
  })
}

// Hook untuk active ujian siswa - EMERGENCY DISABLED
export function useActiveUjianSiswa() {
  console.log('useActiveUjianSiswa: DISABLED to prevent infinite requests')
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve()
  }
}

// Hook untuk optimized batch submit jawaban - EMERGENCY DISABLED
export function useOptimizedBatchSubmitJawaban() {
  console.log('useOptimizedBatchSubmitJawaban: DISABLED to prevent infinite requests')
  return useMutation({
    mutationFn: async () => {
      return null // No-op
    }
  })
}