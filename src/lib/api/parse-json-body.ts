// ==========================================
// API — PARSE JSON BODY
// Canonical request body parser with Zod validation for all API route
// handlers. Replaces raw `await request.json()` casts with structured
// validation that returns a 400 error envelope on failure.
//
// _Bug_Condition: 1.37 — most routes parse `await request.json()` without
//   validation.
// _Expected_Behavior: 2.37 — Zod-validated body before any branch or DB
//   call.
// _Preservation: 3.5, 3.6, 3.8 — existing valid payloads continue to be
//   accepted unchanged.
// ==========================================

import { NextResponse } from 'next/server'
import type { ZodType, ZodTypeDef, ZodError } from 'zod'
import { apiError } from './error-envelope'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/** Successful parse result containing the validated data. */
export interface ParseSuccess<T> {
    data: T
}

/** Failed parse result containing a pre-built error response. */
export interface ParseFailure {
    response: NextResponse
}

/** Discriminated union returned by `parseJsonBody`. */
export type ParseJsonBodyResult<T> = ParseSuccess<T> | ParseFailure

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Formats Zod validation issues into a human-readable message.
 */
function formatZodIssues(error: ZodError): string {
    return error.issues
        .map((issue) => {
            const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
            return `${path}${issue.message}`
        })
        .join('; ')
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Parse and validate a JSON request body against a Zod schema.
 *
 * @param request - The incoming `Request` (or `NextRequest`) to parse.
 * @param schema - A Zod schema describing the expected body shape.
 * @returns On success: `{ data: T }` with the validated and typed body.
 *   On malformed JSON: `{ response }` with a 400 error envelope
 *   (`validation/malformed-json`).
 *   On Zod validation failure: `{ response }` with a 400 error envelope
 *   (`validation/invalid-body`).
 *
 * @example
 *   const result = await parseJsonBody(request, MySchema)
 *   if ('response' in result) return result.response
 *   const { data } = result
 *   // `data` is fully typed as the Zod output type
 */
export async function parseJsonBody<T>(
    request: Request,
    schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<ParseJsonBodyResult<T>> {
    // Step 1: Parse raw JSON
    let rawBody: unknown
    try {
        rawBody = await request.json()
    } catch {
        return {
            response: apiError(
                'validation/malformed-json',
                'Body request bukan JSON yang valid',
            ),
        }
    }

    // Step 2: Validate against Zod schema
    const result = schema.safeParse(rawBody)
    if (!result.success) {
        return {
            response: apiError(
                'validation/invalid-body',
                formatZodIssues(result.error),
            ),
        }
    }

    return { data: result.data }
}
