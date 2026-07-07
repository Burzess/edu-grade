'use client'

import { GuruLayout } from '@/components/layout/guru-layout'
import { AuthGuard } from '@/components/auth/auth-guards'
import { useMiddlewareAuth } from '@/hooks/use-middleware-auth'
import GuruDashboardClient from './guru-dashboard-client'

export default function GuruDashboard() {
  const { userEmail } = useMiddlewareAuth()
  
  // Extract nama dari email sebagai fallback jika tidak ada full_name dari middleware
  const displayName = userEmail?.split('@')[0] || 'Guru'

  return (
    <AuthGuard 
      requiredRole="guru"
      showLoading={false}
    >
      <GuruLayout>
        <div className="p-6 space-y-6">
          {/* Welcome Header */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Selamat datang, {displayName}!
            </h1>
            <p className="text-muted-foreground">
              Kelola ujian dan pantau perkembangan siswa Anda dengan mudah
            </p>
          </div>

          {/* Client Component untuk data dinamis */}
          <GuruDashboardClient />
        </div>
      </GuruLayout>
    </AuthGuard>
  )
}
