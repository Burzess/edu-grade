"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useExamSecurity } from '@/hooks/use-exam-security'
import { toast } from 'sonner'

interface ExamSecurityContextValue {
    isSecurityEnabled: boolean
    securityReport: {
        totalEvents: number
        totalViolationCount: number
        tabSwitches: number
        rightClicks: number
        forbiddenKeys: number
        splitScreenDetections: number
        viewportChanges: number
        orientationSuspicious: number
        currentlyFocused: boolean
        isSplitScreenMode: boolean
    }
    tabSwitchCount: number
    totalViolationCount: number
    isWindowFocused: boolean
    isSplitScreenMode: boolean
    enableSecurity: () => void
    disableSecurity: () => void
    onSecurityViolation?: (violationType: string, details?: any) => void
}

const ExamSecurityContext = createContext<ExamSecurityContextValue | undefined>(undefined)

interface ExamSecurityProviderProps {
    children: React.ReactNode
    examTitle?: string
    onSecurityViolation?: (violationType: string, details?: any) => void
    autoEnable?: boolean
    isSubmitted?: boolean // NEW: Flag to disable security after successful submission
}

export function ExamSecurityProvider({ 
    children, 
    examTitle = "Ujian",
    onSecurityViolation,
    autoEnable = true,
    isSubmitted = false
}: ExamSecurityProviderProps) {
    const [isSecurityEnabled, setIsSecurityEnabled] = useState(autoEnable)
    
    // Custom handler untuk pelanggaran keamanan
    const handleSecurityViolation = (violationType: string, details?: any) => {
        // Call parent handler jika ada
        onSecurityViolation?.(violationType, details)
        
        // Default handling berdasarkan jenis pelanggaran
        switch (violationType) {
            case 'tab_switch':
                // Tidak tampilkan toast untuk 'left', alert akan muncul saat 'returned'
                if (details?.action === 'returned') {
                    toast.warning('� Kembali ke Ujian', {
                        description: 'Anda telah kembali ke halaman ujian. Tetap fokus untuk menyelesaikan ujian.',
                        duration: 4000,
                    })
                }
                break
                
            case 'right_click':
                toast.warning('❌ Klik kanan tidak diizinkan', {
                    description: 'Gunakan hanya fungsi yang disediakan dalam ujian.',
                    duration: 3000,
                })
                break
                
            case 'key_combination':
                toast.warning('⚠️ Kombinasi tombol diblokir', {
                    description: 'Penggunaan shortcut keyboard tidak diizinkan selama ujian.',
                    duration: 3000,
                })
                break
                
            case 'split_screen':
                toast.error('🚨 Split Screen Terdeteksi!', {
                    description: 'Mode split screen tidak diizinkan. Gunakan mode fullscreen untuk ujian.',
                    duration: 10000,
                })
                break
                
            case 'viewport_change':
                // Silent logging untuk viewport changes
                break
                
            case 'orientation_suspicious':
                toast.warning('⚠️ Perubahan Orientasi Mencurigakan', {
                    description: 'Orientasi perangkat tidak sesuai dengan ukuran layar.',
                    duration: 5000,
                })
                break
                
            case 'screenshot_attempt':
                // Different handling based on screenshot method
                const method = details?.method || 'unknown'
                if (details?.attemptCount >= 3) {
                    toast.error('🚨 Multiple Screenshot Attempts!', {
                        description: `${details.attemptCount} percobaan screenshot terdeteksi. Aktivitas ini akan dilaporkan.`,
                        duration: 10000,
                    })
                }
                break
                
            case 'before_unload':
                // This is handled by the browser's native dialog
                break
        }
        
        // Log untuk debugging dan monitoring
        console.warn(`🔒 Exam Security Violation: ${violationType}`, {
            timestamp: new Date().toISOString(),
            type: violationType,
            details,
            examTitle
        })
    }

    const {
        securityEvents,
        isWindowFocused,
        tabSwitchCount,
        isSplitScreenMode,
        totalViolationCount,
        getSecurityReport
    } = useExamSecurity({
        isExamActive: isSecurityEnabled,
        onSecurityViolation: handleSecurityViolation,
        enableAntiCheating: true,
        enableBeforeUnload: true,
        enableFocusDetection: true,
        enableTextSelection: true,
        enableAntiScreenshot: true,
        examTitle,
        isSubmitted // Pass isSubmitted to disable security after submission
    })

    const enableSecurity = () => {
        setIsSecurityEnabled(true)
        toast.success('🔒 Mode Keamanan Ujian Aktif', {
            description: 'Sistem anti-kecurangan telah diaktifkan untuk ujian ini.',
            duration: 3000,
        })
    }

    const disableSecurity = () => {
        setIsSecurityEnabled(false)
        toast.info('🔓 Mode Keamanan Ujian Dinonaktifkan', {
            description: 'Anda dapat kembali menggunakan fitur browser normal.',
            duration: 3000,
        })
    }

    // Auto-enable security saat provider di-mount
    useEffect(() => {
        if (autoEnable && !isSecurityEnabled) {
            enableSecurity()
        }
    }, [autoEnable, isSecurityEnabled])

    // Cleanup saat component unmount
    useEffect(() => {
        return () => {
            // Security hooks akan otomatis cleanup karena dependency isSecurityEnabled
        }
    }, [])

    const value: ExamSecurityContextValue = {
        isSecurityEnabled,
        securityReport: getSecurityReport(),
        tabSwitchCount,
        totalViolationCount,
        isWindowFocused,
        isSplitScreenMode,
        enableSecurity,
        disableSecurity,
        onSecurityViolation: handleSecurityViolation
    }

    return (
        <ExamSecurityContext.Provider value={value}>
            {children}
        </ExamSecurityContext.Provider>
    )
}

export function useExamSecurityContext() {
    const context = useContext(ExamSecurityContext)
    if (context === undefined) {
        throw new Error('useExamSecurityContext must be used within an ExamSecurityProvider')
    }
    return context
}

// Hook untuk komponen yang ingin mendengarkan perubahan status keamanan
export function useExamSecurityStatus() {
    const context = useExamSecurityContext()
    return {
        isSecurityEnabled: context.isSecurityEnabled,
        isWindowFocused: context.isWindowFocused,
        tabSwitchCount: context.tabSwitchCount,
        totalViolationCount: context.totalViolationCount,
        isSplitScreenMode: context.isSplitScreenMode,
        securityReport: context.securityReport
    }
}

// HOC untuk wrap komponen dengan security provider
export function withExamSecurity<T extends object>(
    Component: React.ComponentType<T>,
    options?: {
        examTitle?: string
        onSecurityViolation?: (violationType: string, details?: any) => void
        autoEnable?: boolean
    }
) {
    return function WrappedComponent(props: T) {
        return (
            <ExamSecurityProvider {...options}>
                <Component {...props} />
            </ExamSecurityProvider>
        )
    }
}