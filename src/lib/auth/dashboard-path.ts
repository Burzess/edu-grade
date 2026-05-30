// ==========================================
// AUTH — DASHBOARD PATH RESOLUTION
// Canonical mapping from `UserRole` to its post-login dashboard route.
//
// This module is the SINGLE source of truth for the role → dashboard URL
// relationship. Every redirect that needs to send a user to "their"
// dashboard MUST call `getDashboardPathForRole(role)` instead of inlining
// a ternary or switch over role literals.
//
// _Bug_Condition (1.15): role-to-dashboard ternary repeated 5+ times in
//   `middleware.ts`, `src/app/login/login-form.tsx`,
//   `src/components/auth/role-guard.tsx`, etc.
// _Expected_Behavior (2.15): single `getDashboardPathForRole` (or constant
//   map) used everywhere.
// _Preservation (3.1, 3.2, 3.4): redirect targets per role are unchanged.
// ==========================================

import { ROLES, type UserRole } from '@/types/auth'

/**
 * Literal union of every dashboard route we redirect to. Pinned as an
 * exported type so call sites can type their `useRouter().replace(...)`
 * argument without restating the strings.
 */
export type DashboardPath =
    | '/admin/dashboard'
    | '/guru/dashboard'
    | '/siswa/dashboard'

/**
 * Constant map from `UserRole` to its dashboard route.
 *
 * Frozen via `as const` so TypeScript narrows each value to its exact
 * literal type and accidental mutation is impossible at runtime in
 * development (and a type error in source).
 */
export const DASHBOARD_PATH_BY_ROLE = {
    [ROLES.ADMIN]: '/admin/dashboard',
    [ROLES.GURU]: '/guru/dashboard',
    [ROLES.SISWA]: '/siswa/dashboard',
} as const satisfies Record<UserRole, DashboardPath>

/**
 * Returns the dashboard path for a given user role.
 *
 * Total over `UserRole`: every role literal has exactly one mapped path,
 * so this function never returns `undefined` and never falls through to a
 * default branch. If a new role is added to `UserRole`, the
 * `satisfies Record<UserRole, DashboardPath>` constraint above will fail
 * to compile until the map is updated, surfacing the missing case at
 * build time rather than at runtime.
 *
 * @param role - A canonical `UserRole` value (e.g. from `profiles.role`).
 * @returns The dashboard route the user should land on after login or
 *   when they request the wrong role's section.
 */
export function getDashboardPathForRole(role: UserRole): DashboardPath {
    return DASHBOARD_PATH_BY_ROLE[role]
}
