"use client"

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useExamSecurityContext } from '@/components/providers/exam-security-provider'
import { 
    Shield, 
    ShieldAlert, 
    Eye, 
    EyeOff, 
    Mouse, 
    Keyboard,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Smartphone,
    SplitSquareHorizontal
} from 'lucide-react'

interface ExamSecurityStatusProps {
    showDetails?: boolean
    className?: string
}

export function ExamSecurityStatus({ showDetails = false, className }: ExamSecurityStatusProps) {
    const { 
        isSecurityEnabled, 
        isWindowFocused, 
        tabSwitchCount, 
        isSplitScreenMode,
        securityReport 
    } = useExamSecurityContext()

    if (!showDetails) {
        // Compact version for header/toolbar
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Badge 
                    variant={isSecurityEnabled ? "default" : "secondary"}
                    className="flex items-center gap-1"
                >
                    <Shield className="h-3 w-3" />
                    {isSecurityEnabled ? "Aman" : "Nonaktif"}
                </Badge>
                
                <Badge 
                    variant={isWindowFocused ? "default" : "destructive"}
                    className="flex items-center gap-1"
                >
                    {isWindowFocused ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {isWindowFocused ? "Fokus" : "Tidak Fokus"}
                </Badge>
                
                {tabSwitchCount > 0 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {tabSwitchCount} keluar
                    </Badge>
                )}
                
                {isSplitScreenMode && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                        <SplitSquareHorizontal className="h-3 w-3" />
                        Split Screen
                    </Badge>
                )}
            </div>
        )
    }

    // Detailed version for dashboard/settings
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isSecurityEnabled ? (
                        <Shield className="h-5 w-5 text-green-600" />
                    ) : (
                        <ShieldAlert className="h-5 w-5 text-orange-600" />
                    )}
                    Status Keamanan Ujian
                </CardTitle>
                <CardDescription>
                    Monitoring aktivitas dan pencegahan kecurangan selama ujian berlangsung
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Status Utama */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">Mode Keamanan</span>
                        </div>
                        <Badge variant={isSecurityEnabled ? "default" : "secondary"}>
                            {isSecurityEnabled ? "Aktif" : "Nonaktif"}
                        </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                            {isWindowFocused ? (
                                <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                                <EyeOff className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">Fokus Window</span>
                        </div>
                        <Badge variant={isWindowFocused ? "default" : "destructive"}>
                            {isWindowFocused ? "Fokus" : "Tidak Fokus"}
                        </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                            {isSplitScreenMode ? (
                                <SplitSquareHorizontal className="h-4 w-4 text-red-600" />
                            ) : (
                                <Smartphone className="h-4 w-4 text-green-600" />
                            )}
                            <span className="text-sm font-medium">Mode Layar</span>
                        </div>
                        <Badge variant={isSplitScreenMode ? "destructive" : "default"}>
                            {isSplitScreenMode ? "Split Screen" : "Fullscreen"}
                        </Badge>
                    </div>
                </div>

                {/* Statistik Pelanggaran */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Aktivitas Monitoring
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="text-center p-2 border rounded">
                            <div className="text-lg font-semibold text-brand-500">
                                {securityReport.tabSwitches}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Pindah Tab
                            </div>
                        </div>
                        
                        <div className="text-center p-2 border rounded">
                            <div className="text-lg font-semibold text-orange-600">
                                {securityReport.rightClicks}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Klik Kanan
                            </div>
                        </div>
                        
                        <div className="text-center p-2 border rounded">
                            <div className="text-lg font-semibold text-red-600">
                                {securityReport.forbiddenKeys}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Tombol Terlarang
                            </div>
                        </div>
                        
                        <div className="text-center p-2 border rounded">
                            <div className="text-lg font-semibold text-purple-600">
                                {securityReport.splitScreenDetections}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Split Screen
                            </div>
                        </div>
                        
                        <div className="text-center p-2 border rounded">
                            <div className="text-lg font-semibold text-gray-600">
                                {securityReport.totalEvents}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Total Event
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fitur Keamanan Aktif */}
                <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Fitur Keamanan Aktif
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Text selection diblokir</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Klik kanan diblokir</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Shortcut keyboard diblokir</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Tab switching monitoring</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Before unload warning</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Mobile touch optimized</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Split screen detection</span>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>Viewport monitoring</span>
                        </div>
                    </div>
                </div>

                {/* Peringatan jika ada aktivitas mencurigakan */}
                {(securityReport.tabSwitches > 3 || securityReport.totalEvents > 10 || isSplitScreenMode) && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 text-orange-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Aktivitas Mencurigakan Terdeteksi</span>
                        </div>
                        <div className="text-sm text-orange-700 mt-1 space-y-1">
                            {securityReport.tabSwitches > 3 && (
                                <p>• Terlalu sering keluar dari halaman ujian ({securityReport.tabSwitches} kali)</p>
                            )}
                            {securityReport.splitScreenDetections > 0 && (
                                <p>• Penggunaan split screen terdeteksi ({securityReport.splitScreenDetections} kali)</p>
                            )}
                            {isSplitScreenMode && (
                                <p>• Split screen mode masih aktif - gunakan fullscreen untuk ujian</p>
                            )}
                            {securityReport.totalEvents > 10 && (
                                <p>• Total aktivitas mencurigakan tinggi ({securityReport.totalEvents} events)</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// Komponen untuk guru/admin untuk melihat status keamanan siswa
interface SecuritySummaryProps {
    className?: string
}

export function SecuritySummary({ className }: SecuritySummaryProps) {
    const { securityReport, isWindowFocused, tabSwitchCount, isSplitScreenMode } = useExamSecurityContext()
    
    const getSecurityLevel = () => {
        if (isSplitScreenMode) return { level: 'danger', color: 'red', text: 'Berbahaya' }
        if (securityReport.totalEvents === 0) return { level: 'excellent', color: 'green', text: 'Sangat Baik' }
        if (securityReport.totalEvents <= 3) return { level: 'good', color: 'blue', text: 'Baik' }
        if (securityReport.totalEvents <= 7) return { level: 'warning', color: 'orange', text: 'Perlu Perhatian' }
        return { level: 'danger', color: 'red', text: 'Bermasalah' }
    }
    
    const security = getSecurityLevel()
    
    return (
        <div className={`p-4 border rounded-lg ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Ringkasan Keamanan</h3>
                <Badge 
                    variant={security.level === 'excellent' ? 'default' : 
                           security.level === 'good' ? 'secondary' :
                           security.level === 'warning' ? 'outline' : 'destructive'}
                >
                    {security.text}
                </Badge>
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>Status Fokus:</span>
                    <span className={isWindowFocused ? 'text-green-600' : 'text-red-600'}>
                        {isWindowFocused ? 'Fokus' : 'Tidak Fokus'}
                    </span>
                </div>
                
                <div className="flex justify-between">
                    <span>Keluar Tab:</span>
                    <span className={tabSwitchCount === 0 ? 'text-green-600' : 
                                   tabSwitchCount <= 2 ? 'text-orange-600' : 'text-red-600'}>
                        {tabSwitchCount} kali
                    </span>
                </div>
                
                <div className="flex justify-between">
                    <span>Mode Layar:</span>
                    <span className={isSplitScreenMode ? 'text-red-600' : 'text-green-600'}>
                        {isSplitScreenMode ? 'Split Screen' : 'Fullscreen'}
                    </span>
                </div>
                
                <div className="flex justify-between">
                    <span>Total Pelanggaran:</span>
                    <span className={securityReport.totalEvents === 0 ? 'text-green-600' : 
                                   securityReport.totalEvents <= 5 ? 'text-orange-600' : 'text-red-600'}>
                        {securityReport.totalEvents} event
                    </span>
                </div>
            </div>
        </div>
    )
}