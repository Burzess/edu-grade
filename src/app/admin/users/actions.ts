'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/auth-server'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/server'
import { createAccountSchema, importRowSchema } from '@/lib/schemas/account-schema'

const PERMANENT_BAN_DURATION = '876000h'
const AUDIT_LOG_TIMEOUT_MS = 5000

const resetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(8).max(72),
})

const suspendSchema = z.object({
  user_id: z.string().uuid(),
})

export type ActionResult = {
  success: boolean
  message: string
  userId?: string
}

export async function resetPasswordAction(formData: FormData): Promise<ActionResult> {
  const adminUser = await requireAdmin()
  const parsed = resetPasswordSchema.safeParse({
    user_id: formData.get('user_id'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { success: false, message: 'Validasi gagal' }
  }

  const adminSupabase = await createAdminClient()
  const { error } = await adminSupabase.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
  })

  if (error) {
    logger.error('Failed to reset password:', error)
    return { success: false, message: 'Gagal reset password' }
  }

  await adminSupabase.from('audit_logs').insert({
    actor_id: adminUser.id,
    actor_role: 'admin',
    action: 'reset_password',
    entity_type: 'user',
    entity_id: parsed.data.user_id,
    metadata: { method: 'admin_panel' },
  })

  revalidatePath('/admin/users')
  return { success: true, message: 'Password berhasil direset' }
}

export async function toggleSuspendAction(formData: FormData): Promise<ActionResult> {
  const adminUser = await requireAdmin()
  const parsed = suspendSchema.safeParse({
    user_id: formData.get('user_id'),
  })

  if (!parsed.success) {
    return { success: false, message: 'Validasi gagal' }
  }

  if (parsed.data.user_id === adminUser.id) {
    return { success: false, message: 'Tidak bisa menonaktifkan akun sendiri' }
  }

  const adminSupabase = await createAdminClient()
  const { data: authUser, error: authError } = await adminSupabase.auth.admin.getUserById(
    parsed.data.user_id
  )

  if (authError || !authUser?.user) {
    logger.error('User not found for suspend:', authError)
    return { success: false, message: 'User tidak ditemukan' }
  }

  const bannedUntil = (authUser.user as unknown as { banned_until?: string }).banned_until
  const isSuspended = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false

  const { error } = await adminSupabase.auth.admin.updateUserById(parsed.data.user_id, {
    ban_duration: isSuspended ? 'none' : PERMANENT_BAN_DURATION,
  })

  if (error) {
    logger.error('Failed to update suspend status:', error)
    return { success: false, message: 'Gagal memperbarui status akun' }
  }

  await adminSupabase.from('audit_logs').insert({
    actor_id: adminUser.id,
    actor_role: 'admin',
    action: isSuspended ? 'activate_user' : 'suspend_user',
    entity_type: 'user',
    entity_id: parsed.data.user_id,
    metadata: {
      previous_banned_until: bannedUntil,
      next_banned_until: isSuspended ? null : PERMANENT_BAN_DURATION,
    },
  })

  revalidatePath('/admin/users')
  return {
    success: true,
    message: isSuspended ? 'Akun berhasil diaktifkan' : 'Akun berhasil disuspend',
  }
}

// ─── Create Account Action ────────────────────────────────────────────────────

export async function createAccountAction(input: {
  email: string
  full_name: string
  password: string
  confirm_password: string
  role: 'siswa' | 'guru'
}): Promise<ActionResult> {
  const adminUser = await requireAdmin()

  // Validate input with Zod schema
  const parsed = createAccountSchema.safeParse(input)
  if (!parsed.success) {
    const errorMessages = parsed.error.errors.map((e) => e.message).join(', ')
    return { success: false, message: errorMessages }
  }

  const adminSupabase = await createAdminClient()
  const headerStore = await headers()

  const ipAddress =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  const userAgent = headerStore.get('user-agent') ?? 'unknown'

  // Step 1: Create Supabase Auth user
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.full_name,
        role: parsed.data.role,
      },
    })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return { success: false, message: 'Email sudah terdaftar' }
    }
    logger.error('Failed to create auth user:', { error: authError.message })
    return { success: false, message: `Gagal membuat akun: ${authError.message}` }
  }

  const userId = authData.user.id

  // Step 2: Insert profile
  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: userId,
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    role: parsed.data.role,
  })

  if (profileError) {
    // Rollback: delete the Auth user since profile insert failed
    const { error: deleteError } =
      await adminSupabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      logger.error('Failed to rollback auth user after profile failure:', {
        userId,
        deleteError: deleteError.message,
      })
    }

    logger.error('Failed to insert profile:', { error: profileError.message })
    return { success: false, message: `Gagal menyimpan profil: ${profileError.message}` }
  }

  // Step 3: Record audit log with 5-second timeout
  try {
    const auditLogPromise = adminSupabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      actor_role: 'admin',
      action: 'create_account',
      entity_type: 'user',
      entity_id: userId,
      metadata: {
        email: parsed.data.email,
        role: parsed.data.role,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    const timeoutPromise = new Promise<{ error: { message: string } }>(
      (resolve) => {
        setTimeout(
          () => resolve({ error: { message: 'Audit log timeout' } }),
          AUDIT_LOG_TIMEOUT_MS
        )
      }
    )

    const auditResult = await Promise.race([auditLogPromise, timeoutPromise])

    if ('error' in auditResult && auditResult.error) {
      logger.warn('Audit log write failed or timed out for create_account:', {
        message: auditResult.error.message,
        userId,
      })
    }
  } catch (auditError: unknown) {
    logger.error('Unexpected error writing audit log for create_account:', auditError)
  }

  revalidatePath('/admin/users')
  return { success: true, message: 'Akun berhasil dibuat', userId }
}

// ─── Bulk Import Types ───────────────────────────────────────────────────────

export interface BulkImportRow {
  email: string
  full_name: string
  role: 'siswa' | 'guru'
  password?: string
}

export interface BulkImportRowResult {
  email: string
  success: boolean
  message: string
}

export interface BulkImportResult {
  totalProcessed: number
  successCount: number
  failedCount: number
  results: BulkImportRowResult[]
}

// ─── Bulk Import Action ──────────────────────────────────────────────────────

export async function bulkImportAction(
  rows: BulkImportRow[]
): Promise<BulkImportResult> {
  const adminUser = await requireAdmin()
  const adminSupabase = await createAdminClient()
  const headerStore = await headers()

  const ipAddress =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headerStore.get('x-real-ip') ??
    'unknown'
  const userAgent = headerStore.get('user-agent') ?? 'unknown'

  const results: BulkImportRowResult[] = []
  let successCount = 0
  let failedCount = 0

  for (const row of rows) {
    // Validate row with schema
    const parsed = importRowSchema.safeParse({
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      password: row.password || undefined,
    })

    if (!parsed.success) {
      const errorMessages = parsed.error.errors.map((e) => e.message).join(', ')
      results.push({ email: row.email, success: false, message: errorMessages })
      failedCount++
      continue
    }

    const password = parsed.data.password

    // Step 1: Create Supabase Auth user
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email: row.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: row.full_name,
          role: row.role,
        },
      })

    if (authError) {
      const message = authError.message.includes('already been registered')
        ? 'Email sudah terdaftar'
        : `Gagal membuat akun: ${authError.message}`
      results.push({ email: row.email, success: false, message })
      failedCount++
      continue
    }

    const userId = authData.user.id

    // Step 2: Insert profile
    const { error: profileError } = await adminSupabase.from('profiles').insert({
      id: userId,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
    })

    if (profileError) {
      // Rollback: delete the Auth user since profile insert failed
      const { error: deleteError } =
        await adminSupabase.auth.admin.deleteUser(userId)

      if (deleteError) {
        logger.error('Failed to rollback auth user after profile failure:', {
          userId,
          deleteError: deleteError.message,
        })
      }

      results.push({
        email: row.email,
        success: false,
        message: `Gagal menyimpan profil: ${profileError.message}`,
      })
      failedCount++
      continue
    }

    // Row processed successfully
    results.push({ email: row.email, success: true, message: 'Berhasil' })
    successCount++
  }

  // Record single audit log entry for the entire bulk import
  try {
    const auditLogPromise = adminSupabase.from('audit_logs').insert({
      actor_id: adminUser.id,
      actor_role: 'admin',
      action: 'bulk_import_accounts',
      entity_type: 'user',
      metadata: {
        success_count: successCount,
        failed_count: failedCount,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    const timeoutPromise = new Promise<{ error: { message: string } }>(
      (resolve) => {
        setTimeout(
          () => resolve({ error: { message: 'Audit log timeout' } }),
          AUDIT_LOG_TIMEOUT_MS
        )
      }
    )

    const auditResult = await Promise.race([auditLogPromise, timeoutPromise])

    if ('error' in auditResult && auditResult.error) {
      logger.warn('Audit log write failed or timed out for bulk import:', {
        message: auditResult.error.message,
      })
    }
  } catch (auditError: unknown) {
    logger.error('Unexpected error writing audit log for bulk import:', auditError)
  }

  revalidatePath('/admin/users')

  return {
    totalProcessed: results.length,
    successCount,
    failedCount,
    results,
  }
}
