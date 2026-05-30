// ==========================================
// API — ERROR ENVELOPE
// Canonical error response builder for all API route handlers.
// Replaces the three different error envelope shapes identified in the
// audit (1.51) with a single consistent structure:
//   `{ error: { code, message, correlationId } }`
//
// _Bug_Condition: 1.51 — three different error envelopes returned across
//   API routes.
// _Expected_Behavior: 2.51 — single `{ error: { code, message,
//   correlationId } }` envelope.
// _Preservation: 3.5, 3.6, 3.8, 3.11 — existing tests still pass
//   (envelope adoption is staged in Phase 5; this task only creates the
//   helper).
// ==========================================

import { NextResponse } from 'next/server'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * The canonical error envelope shape returned by all API routes.
 */
export interface ApiErrorEnvelope {
    error: {
        code: string
        message: string
        correlationId: string
    }
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Generates a correlation id suitable for log cross-referencing.
 * Uses `crypto.randomUUID()` when available (Node 19+, all modern Edge
 * runtimes), falling back to a `Math.random()`-based id for
 * environments where `crypto` is not globally available.
 */
function generateCorrelationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback: 8-char base36 prefix — low collision for log correlation
    return `err-${Math.random().toString(36).slice(2, 10)}`
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Build a canonical API error response.
 *
 * @param code - Machine-readable error code (e.g. `'auth/unauthenticated'`,
 *   `'validation/invalid-body'`). Used by clients for programmatic handling.
 * @param message - Human-readable description of the error. Safe to display
 *   to end users (no PII, no stack traces).
 * @param correlationId - Optional correlation id for log cross-referencing.
 *   If omitted, one is auto-generated.
 * @param status - HTTP status code. Defaults to 400 (client error).
 * @returns A `NextResponse` with the JSON body
 *   `{ error: { code, message, correlationId } }` and the given status.
 *
 * @example
 *   // 400 Bad Request (default)
 *   return apiError('validation/invalid-body', 'Missing required field: name')
 *
 * @example
 *   // 500 Internal Server Error with explicit correlation id
 *   return apiError('server/internal', 'Unexpected failure', requestId, 500)
 */
export function apiError(
    code: string,
    message: string,
    correlationId?: string,
    status?: number,
): NextResponse<ApiErrorEnvelope> {
    const resolvedCorrelationId = correlationId ?? generateCorrelationId()
    const resolvedStatus = status ?? 400

    return NextResponse.json(
        { error: { code, message, correlationId: resolvedCorrelationId } },
        { status: resolvedStatus },
    )
}
