/**
 * Canonical Supabase Client Barrel — Disambiguated Exports
 *
 * **Validates: Requirements 2.53**
 *
 * This module is the single source of truth for Supabase client creation.
 * Each export has a unique, environment-specific name so there is no
 * ambiguity when multiple modules import from `@/lib/supabase/...`.
 *
 * - `createBrowserClient` — for Client Components, hooks, realtime
 * - `createServerClient` — for Server Components, Server Actions, Route Handlers
 * - `createAdminClient` — for admin operations that bypass RLS (service-role key)
 *
 * Old paths (`@/lib/supabase/client`, `@/lib/supabase/server`) continue to
 * work via re-export shims for backward compatibility (deleted in Phase 5).
 */

export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient, createAdminClient } from './server'
