// ==========================================
// AUTH — RESOLVE ROLE (DB-BACKED)
// Canonical helper that returns the authoritative `UserRole` for a given
// user id by reading the `profiles` table. This is the SINGLE source of
// truth for "what role does this user have right now?" — every code path
// that needs the role MUST resolve it through this helper instead of
// reading `user.user_metadata.role` (which is client-controlled).
//
// _Bug_Condition (1.32): middleware and other call sites read
//   `user.user_metadata.role` as authoritative; clients can self-elevate
//   by calling `supabase.auth.updateUser({ data: { role: 'admin' } })`.
// _Expected_Behavior (2.32): role comes from the database, not from
//   user-controlled metadata.
// _Preservation (3.1, 3.2, 3.10): for legitimate sessions (where DB role
//   already matched metadata role) the resolved role is unchanged, so
//   downstream redirect outcomes and RLS allow/deny outcomes are
//   bit-identical to the unfixed code.
// ==========================================

import { cache } from 'react'

import { createClient } from '@/lib/supabase/server'
import { isUserRole, type UserRole } from '@/types/auth'

/**
 * Error class thrown by `resolveRole` when the database lookup fails or
 * the resolved row is missing or carries an unrecognized role value.
 *
 * `requireRole` (and any future caller) catches this and translates it
 * into a structured 401/403 response. We keep the class concrete so call
 * sites can `instanceof`-check without resorting to string matching.
 */
export class ResolveRoleError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message)
        this.name = 'ResolveRoleError'
    }
}

/**
 * Internal DB-reading implementation. Exported only so tests can exercise
 * the un-memoized function directly without React's `cache()` storing a
 * promise across test cases. Production code MUST import `resolveRole`
 * (the cached wrapper below), not this symbol.
 *
 * @internal
 */
export async function resolveRoleUncached(userId: string): Promise<UserRole> {
    if (!userId) {
        throw new ResolveRoleError('resolveRole: userId is required')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        throw new ResolveRoleError(
            `resolveRole: failed to fetch profile for user ${userId}`,
            error,
        )
    }
    if (!data) {
        throw new ResolveRoleError(
            `resolveRole: profile not found for user ${userId}`,
        )
    }
    if (!isUserRole(data.role)) {
        throw new ResolveRoleError(
            `resolveRole: invalid role value '${String(data.role)}' on profile ${userId}`,
        )
    }

    return data.role
}

/**
 * Resolve the canonical `UserRole` for `userId` from the `profiles` table.
 *
 * **Per-request memoization.** Wrapped in React's `cache()` so that, within
 * a single Server Component / Route Handler request, repeated calls for
 * the same `userId` share one DB read. Combined with
 * `requireRole`'s own `WeakMap`-keyed cache on `NextRequest`, this is the
 * foundation for requirement 2.22 (single `getClaims` + single `profiles`
 * read per request).
 *
 * @param userId - The Supabase auth user id (UUID). Must be non-empty.
 * @returns The user's `UserRole` as stored in `profiles.role`.
 * @throws {ResolveRoleError} if the userId is empty, the DB query errors,
 *   no profile row exists, or the stored role is not a valid `UserRole`.
 */
export const resolveRole: (userId: string) => Promise<UserRole> = cache(
    resolveRoleUncached,
)
