"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    Shield, 
    Users, 
    AlertTriangle, 
    Activity,
    Eye,
    EyeOff,
    RefreshCw,
    Download,
    Clock,
    SplitSquareHorizontal
} from 'lucide-react'

// Mock data untuk demo - replace dengan real API call
interface StudentSecurityData {
    id: string
    name: string
    ujianId: string
    isOnline: boolean
    isWindowFocused: boolean
    tabSwitchCount: number
    isSplitScreenMode: boolean
    securityEvents: {
        totalEvents: number
        rightClicks: number
        forbiddenKeys: number
        splitScreenDetections: number
        timeAwayMinutes: number
    }
    lastActivity: Date
    riskLevel: 'low' | 'medium' | 'high'
}

const mockStudentData: StudentSecurityData[] = [
    {
        id: '1',
        name: 'Ahmad Wijaya',
        ujianId: 'ujian-123',
        isOnline: true,
        isWindowFocused: true,
        tabSwitchCount: 1,
        isSplitScreenMode: false,
        securityEvents: { totalEvents: 2, rightClicks: 0, forbiddenKeys: 1, splitScreenDetections: 0, timeAwayMinutes: 0.5 },
        lastActivity: new Date(Date.now() - 30000),
        riskLevel: 'low'
    },
    {
        id: '2',
        name: 'Siti Nurhaliza',
        ujianId: 'ujian-123',
        isOnline: true,
        isWindowFocused: false,
        tabSwitchCount: 5,
        isSplitScreenMode: true,
        securityEvents: { totalEvents: 8, rightClicks: 2, forbiddenKeys: 3, splitScreenDetections: 2, timeAwayMinutes: 3.2 },
        lastActivity: new Date(Date.now() - 120000),
        riskLevel: 'medium'
    },
    {
        id: '3',
        name: 'Budi Santoso',
        ujianId: 'ujian-123',
        isOnline: true,
        isWindowFocused: true,
        tabSwitchCount: 12,
        isSplitScreenMode: false,
        securityEvents: { totalEvents: 18, rightClicks: 5, forbiddenKeys: 8, splitScreenDetections: 3, timeAwayMinutes: 8.7 },
        lastActivity: new Date(Date.now() - 60000),
        riskLevel: 'high'
    },
    {
        id: '4',
        name: 'Dewi Kartika',
        ujianId: 'ujian-123',
        isOnline: false,
        isWindowFocused: false,
        tabSwitchCount: 0,
        isSplitScreenMode: false,
        securityEvents: { totalEvents: 0, rightClicks: 0, forbiddenKeys: 0, splitScreenDetections: 0, timeAwayMinutes: 0 },
        lastActivity: new Date(Date.now() - 300000),
        riskLevel: 'low'
    }
]

interface ExamSecurityMonitorProps {
    ujianId: string
    ujianTitle?: string
}

export default function ExamSecurityMonitor({ ujianId, ujianTitle = "Ujian Online" }: ExamSecurityMonitorProps) {
    const [students, setStudents] = useState<StudentSecurityData[]>(mockStudentData)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    // Auto refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return

        const interval = setInterval(() => {
            // In real implementation, fetch data from API
            setLastRefresh(new Date())
            // setStudents(fetchStudentSecurityData(ujianId))
        }, 30000)

        return () => clearInterval(interval)
    }, [autoRefresh, ujianId])

    const handleManualRefresh = () => {
        setLastRefresh(new Date())
        // In real implementation, fetch data from API
        // setStudents(fetchStudentSecurityData(ujianId))
    }

    const handleExportReport = () => {
        // Export security report to CSV/PDF
        const csvData = students.map(student => ({
            Nama: student.name,
            Status: student.isOnline ? 'Online' : 'Offline',
            'Fokus Window': student.isWindowFocused ? 'Ya' : 'Tidak',
            'Mode Layar': student.isSplitScreenMode ? 'Split Screen' : 'Fullscreen',
            'Keluar Tab': student.tabSwitchCount,
            'Total Pelanggaran': student.securityEvents.totalEvents,
            'Klik Kanan': student.securityEvents.rightClicks,
            'Tombol Terlarang': student.securityEvents.forbiddenKeys,
            'Split Screen': student.securityEvents.splitScreenDetections,
            'Waktu Keluar (menit)': student.securityEvents.timeAwayMinutes,
            'Tingkat Risiko': student.riskLevel,
            'Aktivitas Terakhir': student.lastActivity.toLocaleString('id-ID')
        }))
        
        console.log('Exporting security report:', csvData)
        // Implement actual CSV/PDF export
    }

    const getRiskBadgeVariant = (risk: string) => {
        switch (risk) {
            case 'low': return 'default'
            case 'medium': return 'outline'
            case 'high': return 'destructive'
            default: return 'secondary'
        }
    }

    const getRiskText = (risk: string) => {
        switch (risk) {
            case 'low': return 'Rendah'
            case 'medium': return 'Sedang'
            case 'high': return 'Tinggi'
            default: return 'Tidak Diketahui'
        }
    }

    const onlineStudents = students.filter(s => s.isOnline).length
    const focusedStudents = students.filter(s => s.isWindowFocused && s.isOnline).length
    const splitScreenStudents = students.filter(s => s.isSplitScreenMode && s.isOnline).length
    const highRiskStudents = students.filter(s => s.riskLevel === 'high').length

    return (
        <div className="space-y-6">
            {/* Header with stats */}
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
                    
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleExportReport}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Siswa Online</p>
                                <p className="text-2xl font-bold">{onlineStudents}/{students.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-green-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Sedang Fokus</p>
                                <p className="text-2xl font-bold">{focusedStudents}/{onlineStudents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <SplitSquareHorizontal className="h-4 w-4 text-orange-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Split Screen</p>
                                <p className="text-2xl font-bold">{splitScreenStudents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <div>
                                <p className="text-sm text-muted-foreground">Risiko Tinggi</p>
                                <p className="text-2xl font-bold">{highRiskStudents}</p>
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
                                <p className="text-sm font-medium">
                                    {lastRefresh.toLocaleTimeString('id-ID')}
                                </p>
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

            {/* Student monitoring tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="detailed">Detail Siswa</TabsTrigger>
                    <TabsTrigger value="alerts">Peringatan</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4">
                        {students.map((student) => (
                            <Card key={student.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            {student.isOnline ? (
                                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                                            ) : (
                                                <div className="h-2 w-2 bg-gray-400 rounded-full" />
                                            )}
                                            <span className="font-medium">{student.name}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {student.isWindowFocused && student.isOnline ? (
                                                <Badge variant="default" className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    Fokus
                                                </Badge>
                                            ) : student.isOnline ? (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <EyeOff className="h-3 w-3" />
                                                    Tidak Fokus
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Offline</Badge>
                                            )}
                                            
                                            <Badge variant={getRiskBadgeVariant(student.riskLevel)}>
                                                Risiko {getRiskText(student.riskLevel)}
                                            </Badge>
                                            
                                            {student.isSplitScreenMode && (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <SplitSquareHorizontal className="h-3 w-3" />
                                                    Split Screen
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>Tab Switch: {student.tabSwitchCount}</span>
                                        <span>Split Screen: {student.securityEvents.splitScreenDetections}</span>
                                        <span>Total Event: {student.securityEvents.totalEvents}</span>
                                        <span>
                                            Terakhir: {new Date(student.lastActivity).toLocaleTimeString('id-ID')}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="detailed" className="space-y-4">
                    <div className="grid gap-6">
                        {students.map((student) => (
                            <Card key={student.id}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span>{student.name}</span>
                                        <Badge variant={getRiskBadgeVariant(student.riskLevel)}>
                                            Risiko {getRiskText(student.riskLevel)}
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        Status: {student.isOnline ? 'Online' : 'Offline'} • 
                                        Fokus: {student.isWindowFocused ? 'Ya' : 'Tidak'}
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-lg font-semibold text-blue-600">
                                                {student.tabSwitchCount}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Keluar Tab
                                            </div>
                                        </div>
                                        
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-lg font-semibold text-orange-600">
                                                {student.securityEvents.rightClicks}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Klik Kanan
                                            </div>
                                        </div>
                                        
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-lg font-semibold text-red-600">
                                                {student.securityEvents.forbiddenKeys}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Tombol Terlarang
                                            </div>
                                        </div>
                                        
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-lg font-semibold text-purple-600">
                                                {student.securityEvents.splitScreenDetections}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Split Screen
                                            </div>
                                        </div>
                                        
                                        <div className="text-center p-3 border rounded">
                                            <div className="text-lg font-semibold text-gray-600">
                                                {student.securityEvents.timeAwayMinutes.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Menit Keluar
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 p-3 bg-muted rounded text-sm">
                                        <strong>Aktivitas Terakhir:</strong> {student.lastActivity.toLocaleString('id-ID')}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <div className="space-y-4">
                        {students.filter(s => s.riskLevel === 'high' || s.tabSwitchCount > 5 || s.isSplitScreenMode).map((student) => (
                            <Card key={student.id} className="border-red-200 bg-red-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <span className="font-medium text-red-800">
                                            Peringatan: {student.name}
                                        </span>
                                    </div>
                                    
                                    <div className="text-sm text-red-700 space-y-1">
                                        {student.tabSwitchCount > 5 && (
                                            <p>• Keluar tab terlalu sering ({student.tabSwitchCount} kali)</p>
                                        )}
                                        {student.securityEvents.rightClicks > 3 && (
                                            <p>• Klik kanan berlebihan ({student.securityEvents.rightClicks} kali)</p>
                                        )}
                                        {student.securityEvents.forbiddenKeys > 5 && (
                                            <p>• Menggunakan tombol terlarang ({student.securityEvents.forbiddenKeys} kali)</p>
                                        )}
                                        {student.securityEvents.timeAwayMinutes > 5 && (
                                            <p>• Terlalu lama keluar halaman ({student.securityEvents.timeAwayMinutes.toFixed(1)} menit)</p>
                                        )}
                                        {student.isSplitScreenMode && (
                                            <p>• Menggunakan split screen mode ({student.securityEvents.splitScreenDetections} deteksi)</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        
                        {students.filter(s => s.riskLevel === 'high' || s.tabSwitchCount > 5 || s.isSplitScreenMode).length === 0 && (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Tidak Ada Peringatan</h3>
                                    <p className="text-muted-foreground">
                                        Semua siswa mengikuti ujian dengan baik tanpa aktivitas mencurigakan.
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