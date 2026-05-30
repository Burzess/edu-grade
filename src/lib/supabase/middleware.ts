import { createServerClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Result returned by `updateSession`. Exposes the authenticated Supabase
 * client, the validated JWT claims, and the response object (with refreshed
 * cookies) so the main middleware can reuse them without additional
 * auth round-trips.
 *
 * Performance fix (2.22): Before this refactor, `updateSession` called
 * `getClaims()` internally and discarded the result, forcing the main
 * middleware to create a second client and call `getClaims()` + `getUser()`
 * again — up to 4 auth/DB round-trips per request. Now the single
 * `getClaims()` result is surfaced here and the main middleware reuses it.
 * The user ID is extracted directly from the JWT `sub` claim, eliminating
 * the need for a separate `getUser()` network call.
 */
export interface UpdateSessionResult {
  /** The NextResponse with refreshed session cookies. */
  response: NextResponse
  /** The Supabase client bound to this request's cookies. Reuse it for
   *  subsequent queries (e.g. profiles SELECT) to avoid creating a second
   *  client. */
  supabase: SupabaseClient
  /** Claims from the single `getClaims()` call. `null` when no valid JWT
   *  is present (unauthenticated request). */
  claims: Record<string, unknown> | null
  /** Error from `getClaims()`, if any. */
  claimsError: Error | null
  /** User ID extracted from the JWT `sub` claim. `null` when no valid JWT
   *  is present. Avoids a separate `getUser()` network round-trip. */
  userId: string | null
}

/**
 * Update Session Handler - Supabase SSR Best Practice 2026
 *
 * Refreshes the session cookie and validates the JWT in a single
 * `getClaims()` call. Returns the client, claims, and user ID so the
 * main middleware can reuse them — guaranteeing at most 1 `getClaims()`
 * per request and ZERO `getUser()` calls across the entire middleware
 * pipeline (user ID is extracted from the validated JWT `sub` claim).
 *
 * PENTING:
 * - getClaims() memvalidasi JWT signature (lebih aman)
 * - getUser() mengirim request ke server auth (lebih lambat tapi lebih akurat)
 * - getSession() TIDAK aman di server-side (jangan gunakan untuk proteksi)
 */
export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Dengan Fluid compute, jangan simpan client di global variable.
  // Selalu buat client baru di setiap request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // JANGAN jalankan code apapun antara createServerClient dan
  // supabase.auth.getClaims. Kesalahan kecil bisa menyebabkan
  // user logout secara random.

  // PENTING: Menggunakan getClaims() untuk validasi JWT yang aman
  // getClaims() memvalidasi JWT signature terhadap public keys project
  // Lebih cepat dari getUser() karena tidak perlu request ke server
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  // PENTING: Anda *harus* return supabaseResponse object as-is.
  // Jika Anda membuat response object baru dengan NextResponse.next(), pastikan:
  // 1. Pass request di dalamnya:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy cookies:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Ubah myNewResponse sesuai kebutuhan, tapi jangan ubah cookies!

  return {
    response: supabaseResponse,
    supabase,
    claims: claimsData?.claims ?? null,
    claimsError: claimsError ?? null,
    userId: typeof claimsData?.claims?.sub === 'string' ? claimsData.claims.sub : null,
  }
}

/**
 * Resolve the user's role from the `profiles` table using a pre-existing
 * Supabase client. This is the middleware-compatible counterpart to
 * `resolveRole` from `src/lib/auth/resolve-role.ts`.
 *
 * Unlike `resolveRole` (which creates its own client via `createClient()`
 * from `next/headers` — unavailable in Edge middleware), this function
 * accepts the client returned by `updateSession` so no additional client
 * is created and the profiles query reuses the same authenticated
 * connection.
 *
 * Performance (2.22): Combined with `updateSession` returning the user ID
 * from JWT claims, the entire middleware pipeline now performs:
 *   - 1 `getClaims()` (in `updateSession`)
 *   - 0 `getUser()` calls (user ID from JWT `sub`)
 *   - 1 `profiles` SELECT (this function)
 *
 * @param supabase - The Supabase client from `updateSession`.
 * @param userId - The user ID extracted from JWT claims.
 * @returns The user's role, or `null` if resolution fails.
 */
export async function resolveRoleWithClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return typeof data.role === 'string' ? data.role : null
  } catch {
    return null
  }
}
