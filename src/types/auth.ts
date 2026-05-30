// ==========================================
// AUTH TYPES
// Canonical role type and constant for the EduGrade authorization model.
//
// This module is the SINGLE source of truth for the user-role union. Every
// other file that needs the literal `'guru' | 'siswa' | 'admin'` MUST import
// `UserRole` and (when a value is needed) `ROLES` from here, instead of
// restating the union locally.
//
// _Bug_Condition (1.49): role union restated as literal in 30+ locations.
// _Expected_Behavior (2.49): single canonical type alias and `ROLES` const
// imported everywhere.
// ==========================================

/**
 * Union of all valid user roles in EduGrade.
 *
 * The values mirror the `user_role` Postgres enum declared in
 * `src/types/database.ts` and the `profiles.role` column. They MUST stay in
 * sync — adding a role requires updating both the database enum and this
 * type at the same time.
 */
export type UserRole = 'guru' | 'siswa' | 'admin'

/**
 * Constant lookup for `UserRole` values.
 *
 * Use `ROLES.GURU`, `ROLES.SISWA`, `ROLES.ADMIN` instead of inlining the
 * string literal at call sites. The `as const` assertion keeps the value
 * type narrowed to the exact `UserRole` literal so TypeScript catches typos.
 */
export const ROLES = {
    GURU: 'guru',
    SISWA: 'siswa',
    ADMIN: 'admin',
} as const satisfies Record<string, UserRole>

/**
 * All valid `UserRole` values as a readonly tuple. Useful for iteration,
 * Zod enum schemas, and exhaustive checks.
 */
export const USER_ROLES = [ROLES.GURU, ROLES.SISWA, ROLES.ADMIN] as const

/**
 * Type guard that narrows an unknown value to `UserRole`.
 */
export function isUserRole(value: unknown): value is UserRole {
    return value === ROLES.GURU || value === ROLES.SISWA || value === ROLES.ADMIN
}
