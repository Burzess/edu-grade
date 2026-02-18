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
import { 
    AlertTriangle, 
    Shield, 
    Eye,
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
                    icon: <Eye className="h-5 w-5" />,
                    title: 'Meninggalkan Halaman Ujian',
                    description: details?.timeAwayMs 
                        ? `Anda meninggalkan ujian selama ${Math.round(details.timeAwayMs/1000)} detik.`
                        : 'Tab switching terdeteksi.',
                }
            case 'screenshot':
                return {
                    icon: <Shield className="h-5 w-5" />,
                    title: 'Percobaan Screenshot',
                    description: 'Screenshot atau screen capture terdeteksi.',
                }
            case 'right_click':
                return {
                    icon: <AlertTriangle className="h-5 w-5" />,
                    title: 'Klik Kanan Diblokir',
                    description: 'Klik kanan tidak diizinkan selama ujian.',
                }
            case 'key_combination':
                return {
                    icon: <AlertTriangle className="h-5 w-5" />,
                    title: 'Kombinasi Tombol Diblokir',
                    description: `Kombinasi tombol "${details?.key}" tidak diizinkan.`,
                }
            default:
                return {
                    icon: <AlertTriangle className="h-5 w-5" />,
                    title: 'Peringatan Keamanan',
                    description: 'Pelanggaran keamanan terdeteksi.',
                }
        }
    }

    const violationInfo = getViolationInfo()

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xs sm:max-w-sm border-destructive/30">
                <DialogHeader>
                    <div className="flex items-center gap-2.5 text-destructive mb-1">
                        {violationInfo.icon}
                        <DialogTitle className="text-sm font-semibold">
                            {violationInfo.title}
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-sm">
                        {violationInfo.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                        Pelanggaran: <span className="font-medium text-foreground">{violationCount}</span> dari 3
                    </p>

                    {autoSubmitWarning && (
                        <p className="text-destructive font-medium text-xs border border-destructive/20 rounded-md p-2">
                            Pelanggaran berikutnya akan menyebabkan ujian otomatis dikumpulkan.
                        </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                        Semua aktivitas dicatat dan dapat mempengaruhi penilaian.
                    </p>
                </div>

                <DialogFooter>
                    <Button 
                        onClick={onClose}
                        className="w-full"
                        size="sm"
                    >
                        Mengerti, Lanjutkan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}