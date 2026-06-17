"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/auth-guards'
import AdminLayout from '@/components/layout/admin-layout'
import { ExamSecurityMonitor } from '@/components/ujian'

function UjianMonitorPageContent() {
    const params = useParams()
    const ujianId = params.id as string

    return (
        <div className="container mx-auto py-6">
            <ExamSecurityMonitor 
                ujianId={ujianId}
                ujianTitle="Monitoring Ujian"
            />
        </div>
    )
}

export default function UjianMonitorPage() {
    return (
        <AuthGuard requiredRole="admin">
            <AdminLayout>
                <UjianMonitorPageContent />
            </AdminLayout>
        </AuthGuard>
    )
}