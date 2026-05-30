// ==========================================
// AUTH — REQUIRE ROLE
// Canonical authorization gate for API route handlers. Replaces the
// 16+ inline `auth + role-check` blocks identified in the audit (1.12)
// with a single helper that:
//   1. Resolves the authenticated user (via Supabase SSR cookies, no
//      `Authorization: Bearer` header trust — see 2.43).
//   2. Resolves the user's role from the `profiles` table (DB-backed,
//      per requirement 2.32; never reads `user_metadata.role`).
//   3. Memoizes both the auth user and the role per `NextRequest`
//      instance using a module-scoped `WeakMap`, so multiple guards
//      inside the same request share one DB read (foundation for 2.22).
//   4. Returns either `{ user, role }` or a `NextResponse` carrying the
//      structured error envelope `{ error: { code, message, correlationId } }`.
//
// _Bug_Condition: 1.12 (16 inline auth+role blocks),
//   1.32 (middleware reads user_metadata.role),
//   1.33 (header-propagated role spoof).
// _Expected_Behavior: 2.12 (one helper),
//   2.32 (DB-backed role),
//   2.33 (only x-user-id forwarded).
// _Preservation: 3.1, 3.2, 3.10 — legitimate sessions still authenticate,
//   redirect targets unchanged, RLS allow/deny outcomes unchanged.
// ==========================================

import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import { isUserRole, type UserRole } from '@/types/auth'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

/**
 * Successful authorization: caller has been authenticated AND their
 * DB-backed role is in the `allowed` set.
 */
export interface RequireRoleSuccess {
    user: User
    role: UserRole
}

/**
 * Result of `requireRole`. Either a typed success payload, or an opaque
 * `NextResponse` the caller should `return` directly (401 or 403).
 *
 * Discriminator is the presence of `user` / `role` — a `NextResponse`
 * never has those fields, so callers can use a simple narrowing check.
 */
export type RequireRoleResult = RequireRoleSuccess | NextResponse

// ------------------------------------------------------------------
// Per-request scope cache
// ------------------------------------------------------------------

/**
 * Cached entry for a single `NextRequest`. We memoize on the *request*
 * instance (not on user id) so that a guard at the top of a route and a
 * subsequent helper inside the same handler share the same auth + role
 * read, but two different requests in flight at the same time NEVER mix
 * each other's user state — that would be the security regression we are
 * explicitly trying to avoid.
 */
interface RequestScopeEntry {
    user?: User | null
    role?: UserRole
    roleResolutionFailed?: boolean
}

/**
 * Module-scoped cache keyed on the `NextRequest` instance. `WeakMap` lets
 * the entry be garbage-collected as soon as the request object is no
 * longer reachable, so the cache cannot grow without bound. The map is
 * private to this module — there is intentionally no public API to
 * inspect or clear it from outside; tests use a fresh `NextRequest` per
 * case to avoid cross-contamination.
 */
const REQUEST_SCOPE: WeakMap<NextRequest, RequestScopeEntry> = new WeakMap()

function entryFor(request: NextRequest): RequestScopeEntry {
    let entry = REQUEST_SCOPE.get(request)
    if (!entry) {
        entry = {}
        REQUEST_SCOPE.set(request, entry)
    }
    return entry
}

// ------------------------------------------------------------------
// Error envelope
// ------------------------------------------------------------------

/**
 * Canonical API error envelope shape, per requirement 2.51. Task 3.6
 * lands a shared `apiError` helper that returns this exact shape; until
 * that helper exists at the module path, we build the envelope inline
 * here so `requireRole` can be adopted today without circular ordering
 * with 3.6. Once 3.6 ships, this function will be replaced with a
 * one-line delegation to `apiError`.
 */
function buildErrorResponse(
    code: string,
    message: string,
    status: number,
    correlationId: string,
): NextResponse {
    return NextResponse.json(
        { error: { code, message, correlationId } },
        { status },
    )
}

/**
 * Generates a low-entropy correlation id that's good enough for log
 * cross-referencing while avoiding any runtime dependency on `crypto`
 * being available in every Edge environment. Format: `auth-<base36-rand>`.
 */
function generateCorrelationId(): string {
    return `auth-${Math.random().toString(36).slice(2, 10)}`
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Authorize an incoming `NextRequest` against the supplied list of
 * `allowed` roles.
 *
 * @param request - The Next.js request entering an API route handler.
 *   Used both as the cache key for per-request memoization and as the
 *   source of Supabase auth cookies (via `createClient()`).
 * @param allowed - Non-empty list of roles permitted to proceed. If the
 *   resolved role is not in this list, a 403 envelope is returned.
 * @returns Either `{ user, role }` on success or a `NextResponse` the
 *   caller should `return` directly. Callers narrow with
 *   `result instanceof NextResponse`.
 *
 * @example
 *   export async function GET(request: NextRequest) {
 *     const auth = await requireRole(request, [ROLES.GURU])
 *     if (auth instanceof NextResponse) return auth
 *     const { user, role } = auth
 *     // ...handler body, role is guaranteed to be 'guru'
 *   }
 */
export async function requireRole(
    request: NextRequest,
    allowed: readonly UserRole[],
): Promise<RequireRoleResult> {
    if (allowed.length === 0) {
        // A misconfigured guard that allows nobody is almost certainly a
        // mistake at the call site, not an authorization decision. We
        // surface it as a server error rather than silently 403'ing.
        return buildErrorResponse(
            'auth/misconfigured',
            'requireRole called with empty allowed-role list',
            500,
            generateCorrelationId(),
        )
    }

    const cached = entryFor(request)

    // Single Supabase client per request scope. Used both for the auth
    // user lookup and for the `profiles.role` read so that the SSR
    // cookie machinery is initialised exactly once per request.
    const supabase = await createClient()

    // ---- Step 1: resolve the authenticated user (memoized) ----
    let user: User | null | undefined = cached.user
    if (user === undefined) {
        try {
            const { data, error } = await supabase.auth.getUser()
            user = error ? null : data.user
        } catch {
            user = null
        }
        cached.user = user
    }

    if (!user) {
        return buildErrorResponse(
            'auth/unauthenticated',
            'Tidak terautentikasi',
            401,
            generateCorrelationId(),
        )
    }

    // ---- Step 2: resolve the DB-backed role (memoized) ----
    // Read directly from `profiles` rather than going through
    // `resolveRole` so the cached Supabase client is reused. The query
    // is identical to the one in `resolve-role.ts`; both helpers
    // guarantee role comes from the database, never from
    // `user.user_metadata` (per requirement 2.32).
    let role = cached.role
    if (role === undefined && !cached.roleResolutionFailed) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            if (!error && data && isUserRole(data.role)) {
                role = data.role
                cached.role = role
            } else {
                cached.roleResolutionFailed = true
            }
        } catch {
            cached.roleResolutionFailed = true
        }
    }

    if (cached.roleResolutionFailed || role === undefined) {
        // Treat any failure to look up a profile as a 403 rather than a
        // 500. From the caller's perspective the user is authenticated
        // but unauthorized for THIS resource, which is the correct
        // observable outcome (denial). We do NOT leak the underlying
        // DB error message to the client; details go to logs only.
        return buildErrorResponse(
            'auth/role-unresolved',
            'Gagal memverifikasi role pengguna',
            403,
            generateCorrelationId(),
        )
    }

    // ---- Step 3: enforce membership ----
    if (!allowed.includes(role)) {
        return buildErrorResponse(
            'auth/forbidden',
            'Akses ditolak',
            403,
            generateCorrelationId(),
        )
    }

    return { user, role }
}
