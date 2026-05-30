import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseJsonBody } from '@/lib/api/parse-json-body'
import { apiError } from '@/lib/api/error-envelope'
import { aiGradingPostSchema, aiGradingPutSchema } from './_schema'
import type { AiGradingPostPayload, AiGradingPutPayload } from './_schema'
import { aiGradingLimiter } from '@/lib/rate-limit'
import { checkRateLimit } from '@/lib/api/check-rate-limit'
import { gradeSingleJawaban } from '@/lib/grading/grade-single'
import { gradeBatch } from '@/lib/grading/grade-batch'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/ai-grading — Grade a single jawaban.
 * Flow: parse → validate → auth → rate-limit → delegate to service.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth — guru only
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('auth/unauthenticated', 'Tidak terautentikasi', undefined, 401)
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru') {
      return apiError('auth/forbidden', 'Akses ditolak', undefined, 403)
    }

    // Rate limit
    const limited = checkRateLimit(aiGradingLimiter(user.id))
    if (limited) return limited

    // Parse body
    const parsed = await parseJsonBody<AiGradingPostPayload>(request, aiGradingPostSchema)
    if ('response' in parsed) return parsed.response
    const { jawabanId, forceAI } = parsed.data

    // Delegate to service
    const result = await gradeSingleJawaban(supabase, jawabanId, forceAI)

    if (!result.success && result.httpStatus) {
      return apiError('grading/failed', result.error || 'Penilaian gagal', undefined, result.httpStatus)
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    logger.error('POST /api/ai-grading error:', error)
    return apiError('server/internal', 'Terjadi kesalahan pada server', undefined, 500)
  }
}

/**
 * PUT /api/ai-grading — Hybrid batch grading for an entire ujian.
 * Flow: parse → validate → auth → rate-limit → delegate to service.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth — guru only
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return apiError('auth/unauthenticated', 'Tidak terautentikasi', undefined, 401)
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'guru') {
      return apiError('auth/forbidden', 'Akses ditolak', undefined, 403)
    }

    // Rate limit
    const limited = checkRateLimit(aiGradingLimiter(user.id))
    if (limited) return limited

    // Parse body
    const parsed = await parseJsonBody<AiGradingPutPayload>(request, aiGradingPutSchema)
    if ('response' in parsed) return parsed.response
    const { ujianId, useBatching, useOptimized, forceAI } = parsed.data

    // Delegate to service
    const result = await gradeBatch(supabase, { ujianId, useBatching, useOptimized, forceAI })

    if (!result.success && result.httpStatus) {
      return apiError('grading/batch-failed', result.error || 'Penilaian batch gagal', undefined, result.httpStatus)
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    logger.error('PUT /api/ai-grading error:', error)
    return apiError('server/internal', 'Terjadi kesalahan pada server', undefined, 500)
  }
}
