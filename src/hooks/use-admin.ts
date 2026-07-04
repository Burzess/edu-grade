import { useQuery } from '@tanstack/react-query'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const adminKeys = {
  users: {
    all: ['admin', 'users'] as const,
    list: (filters: object) => [...adminKeys.users.all, 'list', filters] as const,
  },
  auditLogs: {
    all: ['admin', 'audit-logs'] as const,
    list: (filters: object) => [...adminKeys.auditLogs.all, 'list', filters] as const,
  },
  monitoring: {
    all: ['admin', 'monitoring'] as const,
    list: (filters: object) => [...adminKeys.monitoring.all, 'list', filters] as const,
  },
}

// ─── Users ────────────────────────────────────────────────────────────────────

interface UseAdminUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: string
}

interface AdminUsersResponse {
  success: boolean
  data: Array<{
    id: string
    email: string
    full_name: string
    role: string
    created_at: string
  }>
  authUsers: Record<string, { banned_until: string | null; last_sign_in_at: string | null }>
  count: number
  stats: { total: number; guru: number; siswa: number; admin: number }
  page: number
  limit: number
  totalPages: number
}

export function useAdminUsers(params?: UseAdminUsersParams) {
  return useQuery({
    queryKey: adminKeys.users.list(params || {}),
    queryFn: async (): Promise<AdminUsersResponse> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.search) searchParams.set('q', params.search)
      if (params?.role && params.role !== 'all') searchParams.set('role', params.role)

      const res = await fetch(`/api/admin/users?${searchParams.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json()
    },
  })
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

interface UseAdminAuditLogsParams {
  page?: number
  limit?: number
  search?: string
}

interface AdminAuditLogsResponse {
  success: boolean
  data: Array<{
    id: string
    action: string
    entity_type: string
    entity_id: string | null
    actor_id: string | null
    actor_role: string | null
    created_at: string
  }>
  count: number
  stats: { total: number; last24h: number }
  page: number
  limit: number
  totalPages: number
}

export function useAdminAuditLogs(params?: UseAdminAuditLogsParams) {
  return useQuery({
    queryKey: adminKeys.auditLogs.list(params || {}),
    queryFn: async (): Promise<AdminAuditLogsResponse> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.search) searchParams.set('q', params.search)

      const res = await fetch(`/api/admin/audit-logs?${searchParams.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch audit logs')
      return res.json()
    },
  })
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

interface UseAdminMonitoringParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  severity?: string
}

interface AdminMonitoringResponse {
  success: boolean
  data: Array<{
    id: string
    event_type: string
    severity: string | null
    user_id: string | null
    ujian_id: string | null
    created_at: string
    profiles: { full_name: string } | null
    ujian: { name: string } | null
  }>
  count: number
  page: number
  limit: number
  totalPages: number
}

export function useAdminMonitoring(params?: UseAdminMonitoringParams) {
  return useQuery({
    queryKey: adminKeys.monitoring.list(params || {}),
    queryFn: async (): Promise<AdminMonitoringResponse> => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', String(params.page))
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.search) searchParams.set('q', params.search)
      if (params?.type && params.type !== 'all') searchParams.set('type', params.type)
      if (params?.severity && params.severity !== 'all') searchParams.set('severity', params.severity)

      const res = await fetch(`/api/admin/monitoring?${searchParams.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch monitoring events')
      return res.json()
    },
  })
}

