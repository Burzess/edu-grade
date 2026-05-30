import { logger } from '@/lib/logger'

const isDebug = process.env.AI_GRADING_DEBUG === 'true'

export interface AIGradingResponse {
  score: number
  feedback: string
  reasoning: string
}

export type ParseResult =
  | { ok: true; data: AIGradingResponse }
  | { ok: false; error: string }

/**
 * Parse and validate an AI grading response from raw LLM text output.
 *
 * Tries JSON extraction (code-fenced → bare object → aggressive regex),
 * then validates score ∈ [0,100], feedback non-empty, reasoning string.
 * Returns a typed Result — never throws.
 *
 * ≤50 lines of logic. Debug logs gated by AI_GRADING_DEBUG env flag.
 */
export function parseAIResponse(text: string): ParseResult {
  if (isDebug) logger.debug('parseAIResponse', { len: text.length })

  const json = extractJson(text)
  if (!json) {
    logger.error('AI parse failed: no JSON found', { code: 'AI_PARSE_NO_JSON', len: text.length })
    return { ok: false, error: 'Tidak ditemukan JSON valid dalam respons AI' }
  }

  // Validate & coerce
  const score = coerceScore(json.score)
  if (score === null) {
    return { ok: false, error: `Skor tidak valid: ${json.score}` }
  }

  const feedback = typeof json.feedback === 'string' && json.feedback.trim()
    ? json.feedback.trim()
    : 'Feedback tidak tersedia'

  const reasoning = typeof json.reasoning === 'string'
    ? json.reasoning.trim()
    : typeof json.reasoning === 'object'
      ? JSON.stringify(json.reasoning)
      : 'Reasoning tidak tersedia'

  const data: AIGradingResponse = { score, feedback, reasoning }
  if (isDebug) logger.debug('parseAIResponse OK', { score })
  return { ok: true, data }
}

// --- Internal helpers (not exported) ---

function extractJson(text: string): Record<string, unknown> | null {
  // 1. Code-fenced JSON
  const fenced = text.match(/```json\s*(\{[\s\S]*?\})\s*```/)
  if (fenced) { const r = tryParse(fenced[1]); if (r) return r }

  // 2. First JSON object containing "score"
  const scored = text.match(/\{\s*"score"\s*:[\s\S]*?\}/)
  if (scored) { const r = tryParse(scored[0]); if (r) return r }

  // 3. Any JSON object
  const any = text.match(/\{[\s\S]*?\}/)
  if (any) { const r = tryParse(any[0]); if (r) return r }

  // 4. Strip non-JSON prefix/suffix
  const stripped = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '').trim()
  if (stripped.startsWith('{')) { const r = tryParse(stripped); if (r) return r }

  // 5. Reconstruct from regex captures
  const s = text.match(/"score"\s*:\s*(\d+)/)
  const f = text.match(/"feedback"\s*:\s*"([^"]*)"/)
  const rr = text.match(/"reasoning"\s*:\s*"([^"]*)"/)
  if (s && f && rr) {
    return { score: parseInt(s[1]), feedback: f[1], reasoning: rr[1] }
  }

  return null
}

function tryParse(str: string): Record<string, unknown> | null {
  try { const o = JSON.parse(str); return typeof o === 'object' && o ? o : null }
  catch { return null }
}

function coerceScore(raw: unknown): number | null {
  if (typeof raw === 'number' && !Number.isNaN(raw) && raw >= 0 && raw <= 100) {
    return Math.round(raw)
  }
  if (typeof raw === 'string') {
    const n = parseInt(raw.replace(/[^0-9]/g, ''))
    if (!isNaN(n) && n >= 0 && n <= 100) return n
  }
  return null
}
