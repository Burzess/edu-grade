"use client"

import React from 'react'
import { useParams } from 'next/navigation'
import { GuruOnlyGuard } from '@/components/auth/role-guard'
import { ExamSecurityMonitor } from '@/components/ujian'

function UjianMonitorPageContent() {
    const params = useParams()
    const ujianId = params.id as string

    return (
        <div className="container mx-auto py-6">
            <ExamSecurityMonitor 
                ujianId={ujianId}
                ujianTitle="Ujian Matematika Kelas X"
            />
        </div>
    )
}

export default function UjianMonitorPage() {
    return (
        <GuruOnlyGuard>
            <UjianMonitorPageContent />
        </GuruOnlyGuard>
    )
}