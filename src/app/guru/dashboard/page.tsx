import Link from 'next/link'
import { GuruLayout } from '@/components/layout/guru-layout'
import { requireGuru } from '@/lib/auth-server'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Users,
  BarChart3,
  FileText,
  PlusCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import GuruDashboardClient from './guru-dashboard-client'

export default async function GuruDashboard() {
  // Server-side auth check - tidak ada loading state
  const user = await requireGuru()

  return (
    <GuruLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Selamat datang, {user.full_name}!
          </h1>
          <p className="text-blue-100">
            Kelola ujian dan pantau perkembangan siswa Anda dengan mudah
          </p>
        </div>

        {/* Client Component untuk data dinamis */}
        <GuruDashboardClient />
      </div>
    </GuruLayout>
  )
}
