"use client"

import React from 'react'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    AlertTriangle, 
    Shield, 
    Eye,
    Clock,
    FileText
} from 'lucide-react'

interface SecurityViolationModalProps {
    isOpen: boolean
    onClose: () => void
    violationType: 'tab_switch' | 'screenshot' | 'right_click' | 'key_combination'
    violationCount: number
    details?: any
    autoSubmitWarning?: boolean
}

export function SecurityViolationModal({
    isOpen,
    onClose,
    violationType,
    violationCount,
    details,
    autoSubmitWarning = false
}: SecurityViolationModalProps) {
    
    const getViolationInfo = () => {
        switch (violationType) {
            case 'tab_switch':
                return {
                    icon: <Eye className="h-8 w-8 text-orange-500" />,
                    title: 'Peringatan: Meninggalkan Halaman Ujian',
                    description: `Anda telah meninggalkan halaman ujian dan kembali. Total pelanggaran: ${violationCount}.`,
                    details: details?.timeAwayMs ? 
                        `Waktu meninggalkan ujian: ${Math.round(details.timeAwayMs/1000)} detik` : 
                        'Aktivitas tab switching terdeteksi',
                    severity: violationCount >= 2 ? 'high' : 'medium'
                }
            case 'screenshot':
                return {
                    icon: <Shield className="h-8 w-8 text-red-500" />,
                    title: 'Peringatan: Percobaan Screenshot',
                    description: `Screenshot atau screen capture terdeteksi! Total pelanggaran: ${violationCount}.`,
                    details: `Metode: ${details?.method || 'Unknown'}`,
                    severity: 'high'
                }
            case 'right_click':
                return {
                    icon: <AlertTriangle className="h-8 w-8 text-yellow-500" />,
                    title: 'Peringatan: Klik Kanan Diblokir',
                    description: 'Klik kanan tidak diizinkan selama ujian berlangsung.',
                    details: 'Gunakan hanya fitur yang disediakan dalam ujian.',
                    severity: 'low'
                }
            case 'key_combination':
                return {
                    icon: <AlertTriangle className="h-8 w-8 text-yellow-500" />,
                    title: 'Peringatan: Kombinasi Tombol Diblokir',
                    description: `Kombinasi tombol "${details?.key}" tidak diizinkan.`,
                    details: 'Penggunaan shortcut keyboard dilarang selama ujian.',
                    severity: 'low'
                }
            default:
                return {
                    icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
                    title: 'Peringatan Keamanan',
                    description: 'Pelanggaran keamanan terdeteksi.',
                    details: 'Harap patuhi aturan ujian.',
                    severity: 'medium'
                }
        }
    }

    const violationInfo = getViolationInfo()
    
    const getSeverityColor = () => {
        switch (violationInfo.severity) {
            case 'high': return 'bg-red-500 text-white'
            case 'medium': return 'bg-orange-500 text-white' 
            case 'low': return 'bg-yellow-500 text-black'
            default: return 'bg-gray-500 text-white'
        }
    }

    const getSeverityLabel = () => {
        switch (violationInfo.severity) {
            case 'high': return 'TINGGI'
            case 'medium': return 'SEDANG'
            case 'low': return 'RENDAH'
            default: return 'NORMAL'
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md border-2 border-red-200 bg-red-50/50 backdrop-blur">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        {violationInfo.icon}
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-lg font-bold text-red-900">
                                {violationInfo.title}
                            </DialogTitle>
                            <Badge className={`text-xs ${getSeverityColor()}`}>
                                {getSeverityLabel()}
                            </Badge>
                        </div>
                    </div>
                    
                    <DialogDescription className="text-red-800 text-base">
                        {violationInfo.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Detail pelanggaran */}
                    <div className="p-3 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700">
                            <strong>Detail:</strong> {violationInfo.details}
                        </p>
                    </div>

                    {/* Informasi jumlah pelanggaran */}
                    <div className="flex items-center gap-2 p-3 bg-orange-100 rounded-lg border border-orange-200">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm text-orange-700">
                            <strong>Total Pelanggaran Keamanan:</strong> {violationCount} dari 3 kali
                        </span>
                    </div>

                    {/* Peringatan auto-submit */}
                    {autoSubmitWarning && (
                        <div className="p-3 bg-red-200 rounded-lg border-2 border-red-400">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-5 w-5 text-red-600" />
                                <span className="font-bold text-red-800">
                                    PERINGATAN TERAKHIR!
                                </span>
                            </div>
                            <p className="text-sm text-red-700">
                                Jika Anda melakukan pelanggaran sekali lagi, ujian akan 
                                <strong className="underline"> OTOMATIS DISERAHKAN</strong>.
                            </p>
                        </div>
                    )}

                    {/* Peringatan umum */}
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700">
                            💡 <strong>Catatan:</strong> Semua aktivitas dicatat dan dapat mempengaruhi 
                            penilaian ujian Anda. Tetap fokus pada halaman ujian.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                    >
                        Saya Mengerti, Lanjutkan Ujian
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}