// ==========================================
// AUTH — GET VALID ACCESS TOKEN
// Canonical helper for fetching a valid Supabase access token from the
// browser/SSR client. This is the SINGLE source of truth for "what's the
// current user's bearer token?" — every call site that needs to attach
// `Authorization: Bearer <token>` to a fetch (or otherwise read the live
// access token) MUST call `getValidAccessToken` instead of inlining a
// local `getUser() → getSession()` block.
//
// _Bug_Condition (1.13): `getValidAccessToken` is copy-pasted into 8+
//   files (`src/hooks/use-kelas.ts`, `src/components/ui/kelas-selector.tsx`,
//   `src/components/kelas/*-widget.tsx`,
//   `src/app/siswa/dashboard/siswa-dashboard-client.tsx`,
//   `src/app/siswa/kelas/[id]/siswa-kelas-detail-client.tsx`, …) with two
//   slightly different shapes — `Promise<string | null>` (dominant) and
//   `Promise<string>` that throws (one outlier).
// _Expected_Behavior (2.13): a single canonical helper imported by every
//   call site.
// _Preservation (3.5, 3.6, 3.13): same token semantics for downstream
//   `Authorization: Bearer …` calls — when the user is signed in we
//   return a string; when the session is missing we return null; when
//   the access token is expired we return the refreshed value (because
//   `auth.getUser()` triggers Supabase's built-in refresh).
//
// Migration plan: this file establishes the symbol. Phase 2 (task 4.10)
// removes the inline copies and switches each call site to import from
// here. Same-origin call sites that go through SSR cookies will be
// pruned to drop manual `Authorization: Bearer` forwarding altogether
// (per requirement 2.43); cross-origin / explicit-token call sites keep
// using this helper.
// ==========================================

import type { SupabaseClient } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

/**
 * Minimum surface of the Supabase client we need. Typed as a structural
 * subset so the helper can accept either a real
 * `SupabaseClient<Database>` or an injected fake from a test, without
 * forcing tests to spin up the full client just to mock two methods.
 *
 * @internal
 */
export interface SupabaseAuthForToken {
    auth: {
        getUser: SupabaseClient['auth']['getUser']
        getSession: SupabaseClient['auth']['getSession']
    }
}

/**
 * Resolve a valid access token for the current Supabase session.
 *
 * Behavior:
 *   - **Happy path** — when `auth.getUser()` returns a real user and
 *     `auth.getSession()` carries an `access_token`, the token string is
 *     returned. This is the bytes-for-bytes preservation contract for
 *     authenticated requests.
 *   - **Expired path** — when the access token is expired, calling
 *     `auth.getUser()` first triggers Supabase's built-in refresh
 *     machinery; the subsequent `auth.getSession()` then surfaces the
 *     refreshed token. Callers see a fresh `string` with no special
 *     handling.
 *   - **Missing-session path** — when the user is signed out, the user
 *     is invalid, or refresh fails, `null` is returned. Callers MUST
 *     branch on `null` (typically: redirect to `/login` or surface a
 *     "Session tidak valid atau expired" error) instead of forwarding
 *     an empty Bearer header.
 *   - **Error swallowing** — any thrown error from the underlying client
 *     is converted to `null`. The helper is intentionally non-throwing
 *     so call sites do not need a `try/catch` around every fetch.
 *
 * Why `getUser()` BEFORE `getSession()`:
 *   `getSession()` is cookie-only and trusts whatever cookie value is
 *   present. `getUser()` round-trips to Supabase Auth and validates the
 *   JWT signature, which is what the audit's inline copies were doing
 *   (per the comment "Selalu validasi dengan getUser() terlebih dahulu
 *   yang memverifikasi dengan server"). Calling it first preserves the
 *   security property that we never hand out a token attached to a
 *   user that no longer exists or has been revoked, AND it triggers a
 *   refresh when the access token is expired. Both behaviors are
 *   load-bearing — see the unit tests in `get-access-token.test.ts`.
 *
 * @param client - Optional Supabase client. When provided (the dominant
 *   call-site pattern in components that already have one in scope), it
 *   is used as-is. When omitted, a fresh browser client is created via
 *   `@/lib/supabase/client`. Accepting the client avoids allocating a
 *   second instance per render in components that already hold one.
 * @returns A valid access token, or `null` if the session is missing,
 *   the user is invalid, or refresh fails.
 */
export async function getValidAccessToken(
    client?: SupabaseAuthForToken,
): Promise<string | null> {
    const supabase = client ?? (createClient() as unknown as SupabaseAuthForToken)
    try {
        const {
            data: { user },
            error,
        } = await supabase.auth.getUser()
        if (error || !user) return null

        const {
            data: { session },
        } = await supabase.auth.getSession()
        return session?.access_token ?? null
    } catch {
        return null
    }
}
