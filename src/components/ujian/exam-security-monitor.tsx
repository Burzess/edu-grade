"use client"

import React, { useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
    Shield,
    AlertTriangle,
    Activity,
    RefreshCw,
    Clock,
    SplitSquareHorizontal,
    Monitor,
    MousePointerClick,
    Keyboard,
    Camera,
} from 'lucide-react'
import { useAdminMonitoring } from '@/hooks/use-admin'

interface ExamSecurityMonitorProps {
    ujianId: string
    ujianTitle?: string
}

const EVENT_TYPE_LABELS: Record<string, string> = {
    tab_switch: 'Keluar Tab',
    screenshot_attempt: 'Screenshot',
    split_screen: 'Split Screen',
    right_click: 'Klik Kanan',
    key_combination: 'Kombinasi Tombol',
    before_unload: 'Before Unload',
    orientation_suspicious: 'Orientasi',
    viewport_change: 'Perubahan Viewport',
    text_selection: 'Seleksi Teks',
}

function getEventIcon(eventType: string) {
    switch (eventType) {
        case 'tab_switch':
            return <Monitor className="h-4 w-4" />
        case 'screenshot_attempt':
            return <Camera className="h-4 w-4" />
        case 'split_screen':
            return <SplitSquareHorizontal className="h-4 w-4" />
        case 'right_click':
            return <MousePointerClick className="h-4 w-4" />
        case 'key_combination':
            return <Keyboard className="h-4 w-4" />
        default:
            return <Activity className="h-4 w-4" />
    }
}

function getSeverityBadge(severity: string | null) {
    const normalized = severity || 'info'
    if (normalized === 'critical' || normalized === 'high') {
        return <Badge variant="destructive">Tinggi</Badge>
    }
    if (normalized === 'warning' || normalized === 'medium') {
        return <Badge variant="secondary">Sedang</Badge>
    }
    return <Badge className="bg-cyan-100 text-cyan-800">Info</Badge>
}

function formatDate(value: string | null): string {
    return value ? format(new Date(value), 'dd MMM yyyy, HH:mm:ss', { locale: idLocale }) : '-'
}

function getUserName(event: { profiles?: { full_name: string } | null; user_id: string | null }): string {
    return event.profiles?.full_name || (event.user_id ? `${event.user_id.slice(0, 8)}...` : '-')
}

function getUjianName(event: { ujian?: { name: string } | null; ujian_id: string | null }): string {
    if (!event.ujian_id) return '-'
    return event.ujian?.name || '-'
}

export default function ExamSecurityMonitor({ ujianId, ujianTitle = "Ujian Online" }: ExamSecurityMonitorProps) {
    const [autoRefresh, setAutoRefresh] = useState(true)

    const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useAdminMonitoring({
        limit: 50,
        search: ujianId,
    })

    // Auto-refresh every 30 seconds using TanStack Query refetchInterval pattern
    React.useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(() => {
            void refetch()
        }, 30000)

        return () => clearInterval(interval)
    }, [autoRefresh, refetch])

    const events = data?.data ?? []

    // Compute summary counts by event type
    const tabSwitchCount = events.filter(e => e.event_type === 'tab_switch').length
    const screenshotCount = events.filter(e => e.event_type === 'screenshot_attempt').length
    const splitScreenCount = events.filter(e => e.event_type === 'split_screen').length
    const rightClickCount = events.filter(e => e.event_type === 'right_click').length
    const keyCombinationCount = events.filter(e => e.event_type === 'key_combination').length

    // High severity events
    const highSeverityEvents = events.filter(e => e.severity === 'high' || e.severity === 'critical')

    const handleManualRefresh = () => {
        void refetch()
    }

    const lastRefreshTime = dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID')
        : '-'

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">Monitor Keamanan Ujian</h1>
                </div>
                <Card>
                    <CardContent className="p-8 text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Memuat data monitoring...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Error state
    if (isError) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">Monitor Keamanan Ujian</h1>
                </div>
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-8 text-center">
                        <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Gagal Memuat Data</h3>
                        <p className="text-red-700 mb-4">
                            {error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data monitoring.'}
                        </p>
                        <Button variant="outline" onClick={handleManualRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Coba Lagi
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6" />
                        Monitor Keamanan Ujian
                    </h1>
                    <p className="text-muted-foreground">{ujianTitle}</p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRefresh}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-brand-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Event</p>
                                <p className="text-2xl font-bold">{data?.count ?? 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-orange-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Tab Switch</p>
                                <p className="text-2xl font-bold">{tabSwitchCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <SplitSquareHorizontal className="h-4 w-4 text-red-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Split Screen</p>
                                <p className="text-2xl font-bold">{splitScreenCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Severity Tinggi</p>
                                <p className="text-2xl font-bold">{highSeverityEvents.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Update Terakhir</p>
                                <p className="text-sm font-medium">{lastRefreshTime}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Auto refresh toggle */}
            <div className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                />
                <label htmlFor="autoRefresh" className="text-muted-foreground">
                    Auto refresh setiap 30 detik
                </label>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="events">Daftar Event</TabsTrigger>
                    <TabsTrigger value="alerts">Peringatan</TabsTrigger>
                </TabsList>

                {/* Overview Tab - Summary by event type */}
                <TabsContent value="overview" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Ringkasan Pelanggaran
                            </CardTitle>
                            <CardDescription>
                                Jumlah pelanggaran berdasarkan jenis event untuk ujian ini.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="text-center p-3 border rounded">
                                    <div className="flex justify-center mb-2">
                                        <Monitor className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div className="text-lg font-semibold text-orange-600">
                                        {tabSwitchCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Tab Switch
                                    </div>
                                </div>

                                <div className="text-center p-3 border rounded">
                                    <div className="flex justify-center mb-2">
                                        <Camera className="h-5 w-5 text-red-600" />
                                    </div>
                                    <div className="text-lg font-semibold text-red-600">
                                        {screenshotCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Screenshot
                                    </div>
                                </div>

                                <div className="text-center p-3 border rounded">
                                    <div className="flex justify-center mb-2">
                                        <SplitSquareHorizontal className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div className="text-lg font-semibold text-purple-600">
                                        {splitScreenCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Split Screen
                                    </div>
                                </div>

                                <div className="text-center p-3 border rounded">
                                    <div className="flex justify-center mb-2">
                                        <MousePointerClick className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div className="text-lg font-semibold text-yellow-600">
                                        {rightClickCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Klik Kanan
                                    </div>
                                </div>

                                <div className="text-center p-3 border rounded">
                                    <div className="flex justify-center mb-2">
                                        <Keyboard className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div className="text-lg font-semibold text-gray-600">
                                        {keyCombinationCount}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Kombinasi Tombol
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {events.length === 0 && (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Tidak Ada Pelanggaran</h3>
                                <p className="text-muted-foreground">
                                    Belum ada pelanggaran keamanan yang tercatat untuk ujian ini.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Events Tab - Table of recent events */}
                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Daftar Event Keamanan
                            </CardTitle>
                            <CardDescription>
                                Event keamanan terbaru yang tercatat untuk ujian ini.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {events.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Belum ada event keamanan.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px] text-center">No</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Severity</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Ujian</TableHead>
                                            <TableHead>Waktu</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {events.map((event, index) => (
                                            <TableRow key={event.id}>
                                                <TableCell className="text-center">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getEventIcon(event.event_type)}
                                                        <span className="font-medium">
                                                            {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                                                <TableCell>{getUserName(event)}</TableCell>
                                                <TableCell>{getUjianName(event)}</TableCell>
                                                <TableCell>{formatDate(event.created_at)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Alerts Tab - High severity events */}
                <TabsContent value="alerts" className="space-y-4">
                    <div className="space-y-4">
                        {highSeverityEvents.length > 0 ? (
                            highSeverityEvents.map((event) => (
                                <Card key={event.id} className="border-red-200 bg-red-50">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <span className="font-medium text-red-800">
                                                {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                                            </span>
                                            {getSeverityBadge(event.severity)}
                                        </div>
                                        <div className="text-sm text-red-700 space-y-1">
                                            <p>User: {getUserName(event)}</p>
                                            <p>Ujian: {getUjianName(event)}</p>
                                            <p>Waktu: {formatDate(event.created_at)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Tidak Ada Peringatan</h3>
                                    <p className="text-muted-foreground">
                                        Tidak ada pelanggaran dengan severity tinggi untuk ujian ini.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
