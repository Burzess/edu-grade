"use client"

import { useEffect, useCallback, useState, useRef } from 'react'
import { toast } from 'sonner'
import { useAntiScreenshot } from './use-anti-screenshot'

export interface ViolationAutoSubmitConfig {
    maxViolations: number
    autoSubmitOnThreshold: boolean
    violationTypes: string[]
}

/**
 * Pure function that determines whether auto-submit should be triggered
 * based on the total violation count and configuration.
 *
 * Returns true iff totalViolationCount >= config.maxViolations AND config.autoSubmitOnThreshold === true
 */
export function shouldAutoSubmitOnViolation(
    totalViolationCount: number,
    config: ViolationAutoSubmitConfig
): boolean {
    return totalViolationCount >= config.maxViolations && config.autoSubmitOnThreshold
}

interface UseExamSecurityOptions {
    isExamActive?: boolean
    onSecurityViolation?: (violationType: string, details?: unknown) => void
    onAutoSubmit?: () => Promise<void>
    violationAutoSubmitConfig?: ViolationAutoSubmitConfig
    enableAntiCheating?: boolean
    enableBeforeUnload?: boolean
    enableFocusDetection?: boolean
    enableTextSelection?: boolean
    enableAntiScreenshot?: boolean
    examTitle?: string
    isSubmitted?: boolean // Flag to disable security after successful submission
    ujianId?: string
}

interface SecurityEvent {
    type: 'tab_switch' | 'before_unload' | 'text_selection' | 'right_click' | 'key_combination' | 'split_screen' | 'viewport_change' | 'orientation_suspicious' | 'screenshot_attempt'
    timestamp: Date
    details?: Record<string, unknown>
}

export function getSeverityForEvent(eventType: string): string {
    switch (eventType) {
        case 'screenshot_attempt':
        case 'split_screen':
            return 'high'
        case 'tab_switch':
            return 'medium'
        case 'right_click':
        case 'key_combination':
            return 'warning'
        default:
            return 'info'
    }
}

export function useExamSecurity(options: UseExamSecurityOptions = {}) {
    const {
        isExamActive = true,
        onSecurityViolation,
        onAutoSubmit,
        violationAutoSubmitConfig,
        enableAntiCheating = true,
        enableBeforeUnload = true,
        enableFocusDetection = true,
        enableTextSelection = true,
        enableAntiScreenshot = true,
        examTitle = 'Ujian',
        isSubmitted = false,
        ujianId
    } = options

    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
    const [isWindowFocused, setIsWindowFocused] = useState(true)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [isSplitScreenMode, setIsSplitScreenMode] = useState(false)
    const [totalViolationCount, setTotalViolationCount] = useState(0)
    const totalViolationRef = useRef(0) // Ref to avoid stale closure
    const lastRecordTime = useRef(0) // Debounce duplicate events
    const autoSubmitTriggeredRef = useRef(false) // Prevent multiple auto-submit triggers
    const warningShownRef = useRef(false) // Prevent duplicate warning notifications
    const [initialViewport, setInitialViewport] = useState<{width: number, height: number} | null>(null)
    const lastVisibilityChange = useRef<Date>(new Date())
    const focusWarningShown = useRef(false)
    const lastOrientation = useRef<number | null>(null)
    const suspiciousResizeCount = useRef(0)

    // Keep ref in sync with state
    useEffect(() => {
        totalViolationRef.current = totalViolationCount
    }, [totalViolationCount])

    // Function untuk mencatat event keamanan
    const recordSecurityEvent = useCallback((type: SecurityEvent['type'], details?: any) => {
        // Debounce: ignore duplicate events within 500ms
        const now = Date.now()
        if (now - lastRecordTime.current < 500 && type !== 'tab_switch') {
            return
        }
        lastRecordTime.current = now

        // Increment total violation count for significant violations
        const significantViolations = ['screenshot_attempt', 'tab_switch', 'right_click', 'key_combination']
        let newTotalCount = totalViolationRef.current
        
        if (significantViolations.includes(type)) {
            // Only count 'returned' action for tab_switch, not 'left'
            if (type === 'tab_switch' && details?.action !== 'returned') {
                // Don't increment for 'left' action
            } else {
                newTotalCount += 1
                totalViolationRef.current = newTotalCount
                setTotalViolationCount(newTotalCount)
            }
        }

        const event: SecurityEvent = {
            type,
            timestamp: new Date(),
            details: {
                ...details,
                totalViolationCount: newTotalCount
            }
        }
        
        setSecurityEvents(prev => [...prev, event])
        onSecurityViolation?.(type, event.details)

        // Check violation threshold for auto-submit
        if (violationAutoSubmitConfig && onAutoSubmit && !autoSubmitTriggeredRef.current) {
            // Display warning at maxViolations - 1
            if (
                newTotalCount === violationAutoSubmitConfig.maxViolations - 1 &&
                !warningShownRef.current
            ) {
                warningShownRef.current = true
                toast.warning('⚠️ Peringatan Pelanggaran', {
                    description: 'Pelanggaran berikutnya akan menyebabkan ujian dikumpulkan otomatis.',
                    duration: 8000,
                })
            }

            // Trigger auto-submit when threshold is reached
            if (shouldAutoSubmitOnViolation(newTotalCount, violationAutoSubmitConfig)) {
                autoSubmitTriggeredRef.current = true
                onAutoSubmit().catch(() => {
                    // On submission failure, show error notification and retain local state
                    autoSubmitTriggeredRef.current = false
                    toast.error('❌ Gagal mengumpulkan ujian otomatis', {
                        description: 'Terjadi kesalahan saat mengumpulkan ujian. Jawaban Anda tetap tersimpan di perangkat.',
                        duration: 10000,
                    })
                })
            }
        }

        // Send event to server (request-scoped) so RLS can allow user inserts
        ;(async () => {
            try {
                await fetch('/api/admin/security-events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify({
                        ujian_id: ujianId ?? null,
                        event_type: type,
                        severity: getSeverityForEvent(type),
                        details: event.details,
                        source: 'client'
                    })
                })
            } catch (err) {
                console.error('[ExamSecurity] Failed to record event:', {
                    event_type: type,
                    ujian_id: ujianId ?? null,
                    error: err instanceof Error ? err.message : String(err)
                })
            }
        })()
    }, [onSecurityViolation, onAutoSubmit, violationAutoSubmitConfig, ujianId])

    // Screenshot attempt handler
    const handleScreenshotAttempt = useCallback((method: string, details?: any) => {
        recordSecurityEvent('screenshot_attempt', { method, ...details })
        
        // Show appropriate toast based on method
        switch (method) {
            case 'printscreen':
                toast.error('🚫 Print Screen Diblokir!', {
                    description: 'Screenshot tidak diizinkan selama ujian berlangsung.',
                    duration: 5000,
                })
                break
            case 'keyboard_shortcut':
                toast.error('🚫 Shortcut Screenshot Diblokir!', {
                    description: 'Kombinasi tombol screenshot tidak diizinkan.',
                    duration: 5000,
                })
                break
            case 'browser_api':
                toast.warning('⚠️ Aktivitas Screenshot Terdeteksi', {
                    description: 'Penggunaan API screenshot dipantau dan dicatat.',
                    duration: 4000,
                })
                break
            case 'touch_gesture':
                toast.warning('📱 Gesture Screenshot Terdeteksi', {
                    description: 'Gesture screenshot pada perangkat mobile tidak diizinkan.',
                    duration: 4000,
                })
                break
            default:
                toast.error('🚨 Screenshot Attempt Blocked', {
                    description: 'Percobaan screenshot telah diblokir dan dicatat.',
                    duration: 4000,
                })
        }
    }, [recordSecurityEvent])

    // Initialize anti-screenshot protection
    const {
        screenshotAttempts,
        isProtectionActive: isAntiScreenshotActive,
        totalAttempts: screenshotTotalAttempts,
        recentAttempts: screenshotRecentAttempts
    } = useAntiScreenshot({
        isActive: isExamActive && enableAntiScreenshot,
        onScreenshotAttempt: handleScreenshotAttempt,
        enableKeyboardBlocking: true,
        enableAPIBlocking: true,
        enableTouchBlocking: true,
        enableVisibilityProtection: true
    })

    // Disable text selection
    useEffect(() => {
        if (!isExamActive || !enableTextSelection) return

        const style = document.createElement('style')
        style.textContent = `
            /* Disable text selection globally during exam */
            * {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            
            /* Allow selection only in input fields */
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            
            /* Disable context menu */
            body {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
        `
        
        document.head.appendChild(style)
        
        return () => {
            document.head.removeChild(style)
        }
    }, [isExamActive, enableTextSelection])

    // Prevent right click context menu
    useEffect(() => {
        if (!isExamActive || !enableAntiCheating) return

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            recordSecurityEvent('right_click', { x: e.clientX, y: e.clientY })
            toast.warning('Klik kanan tidak diizinkan selama ujian!')
            return false
        }

        document.addEventListener('contextmenu', handleContextMenu)
        
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu)
        }
    }, [isExamActive, enableAntiCheating, recordSecurityEvent])

    // Prevent key combinations (F12, Ctrl+Shift+I, etc.)
    useEffect(() => {
        if (!isExamActive || !enableAntiCheating) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // List of forbidden key combinations
            const forbiddenKeys = [
                // Developer tools
                e.key === 'F12',
                (e.ctrlKey && e.shiftKey && e.key === 'I'), // Ctrl+Shift+I
                (e.ctrlKey && e.shiftKey && e.key === 'J'), // Ctrl+Shift+J
                (e.ctrlKey && e.shiftKey && e.key === 'C'), // Ctrl+Shift+C
                (e.ctrlKey && e.key === 'u'), // View source
                
                // Browser shortcuts
                (e.ctrlKey && e.key === 'r'), // Refresh
                (e.key === 'F5'), // Refresh
                (e.ctrlKey && e.key === 'w'), // Close tab
                (e.ctrlKey && e.key === 't'), // New tab
                (e.ctrlKey && e.key === 'n'), // New window
                (e.ctrlKey && e.shiftKey && e.key === 'N'), // Incognito
                (e.altKey && e.key === 'Tab'), // Alt+Tab
                (e.altKey && e.key === 'F4'), // Alt+F4
                
                // Text manipulation that could be used for cheating
                (e.ctrlKey && e.key === 'a'), // Select all (except in input fields)
                (e.ctrlKey && e.key === 'c'), // Copy (except in input fields)
                (e.ctrlKey && e.key === 'v'), // Paste (except in input fields)
                (e.ctrlKey && e.key === 'x'), // Cut (except in input fields)
                (e.ctrlKey && e.key === 'z'), // Undo (except in input fields)
                (e.ctrlKey && e.key === 'y'), // Redo (except in input fields)
            ]

            // Allow copy/paste only in input fields
            const isInputField = e.target instanceof HTMLInputElement || 
                                e.target instanceof HTMLTextAreaElement ||
                                (e.target as Element)?.getAttribute('contenteditable') === 'true'

            if (!isInputField && (e.ctrlKey && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key))) {
                e.preventDefault()
                recordSecurityEvent('key_combination', { 
                    key: e.key, 
                    ctrlKey: e.ctrlKey, 
                    shiftKey: e.shiftKey, 
                    altKey: e.altKey 
                })
                toast.warning('Kombinasi tombol tidak diizinkan selama ujian!')
                return false
            }

            if (forbiddenKeys.some(condition => condition)) {
                e.preventDefault()
                recordSecurityEvent('key_combination', { 
                    key: e.key, 
                    ctrlKey: e.ctrlKey, 
                    shiftKey: e.shiftKey, 
                    altKey: e.altKey 
                })
                toast.warning('Kombinasi tombol tidak diizinkan selama ujian!')
                return false
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isExamActive, enableAntiCheating, recordSecurityEvent])

    // Window focus detection - Skip violations if exam is submitted
    useEffect(() => {
        if (!isExamActive || !enableFocusDetection) return

        const handleVisibilityChange = () => {
            const isVisible = !document.hidden
            const now = new Date()
            
            if (!isVisible) {
                // User switched tab or minimized
                setIsWindowFocused(false)
                setTabSwitchCount(prev => prev + 1)
                lastVisibilityChange.current = now
                
                // Don't record violation if exam is successfully submitted
                if (!isSubmitted) {
                    recordSecurityEvent('tab_switch', { 
                        action: 'left',
                        tabSwitchCount: tabSwitchCount + 1
                    })
                }
                
                // Tidak tampilkan toast saat leave, alert akan muncul saat returned
                focusWarningShown.current = true
            } else {
                // User returned to tab
                setIsWindowFocused(true)
                const timeAway = now.getTime() - lastVisibilityChange.current.getTime()
                
                // Don't record violation if exam is successfully submitted
                if (!isSubmitted) {
                    recordSecurityEvent('tab_switch', { 
                        action: 'returned',
                        timeAwayMs: timeAway,
                        tabSwitchCount: tabSwitchCount
                    })
                }
                
                // Reset warning flag after a delay
                setTimeout(() => {
                    focusWarningShown.current = false
                }, 3000)
            }
        }

        // Only use visibilitychange — blur/focus are redundant and cause double counting
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isExamActive, enableFocusDetection, recordSecurityEvent, tabSwitchCount, isSubmitted])

    // Before unload warning - Skip if exam is successfully submitted
    useEffect(() => {
        if (!isExamActive || !enableBeforeUnload || isSubmitted) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Don't record or show warning if exam is successfully submitted
            if (isSubmitted) {
                return
            }
            
            recordSecurityEvent('before_unload', { timestamp: new Date() })
            
            const message = `Anda akan keluar dari ${examTitle}. Semua jawaban yang belum disimpan akan hilang. Yakin ingin keluar?`
            e.preventDefault()
            e.returnValue = message
            return message
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [isExamActive, enableBeforeUnload, examTitle, recordSecurityEvent, isSubmitted])

    // Mobile-specific security measures
    useEffect(() => {
        if (!isExamActive) return

        // Store initial viewport size
        const storeInitialViewport = () => {
            if (!initialViewport) {
                setInitialViewport({
                    width: window.innerWidth,
                    height: window.innerHeight
                })
                lastOrientation.current = window.screen?.orientation?.angle || 0
            }
        }

        storeInitialViewport()

        // Detect split screen mode through viewport changes
        const handleResize = () => {
            const currentWidth = window.innerWidth
            const currentHeight = window.innerHeight
            
            if (initialViewport) {
                const widthRatio = currentWidth / initialViewport.width
                const heightRatio = currentHeight / initialViewport.height
                
                // Detect significant viewport reduction that might indicate split screen
                const significantReduction = widthRatio < 0.7 || heightRatio < 0.7
                const suspiciousAspectRatio = (currentWidth / currentHeight) < 0.5 || (currentWidth / currentHeight) > 3
                
                if (significantReduction || suspiciousAspectRatio) {
                    suspiciousResizeCount.current += 1
                    
                    // Only trigger after multiple suspicious resizes to avoid false positives
                    if (suspiciousResizeCount.current >= 2) {
                        setIsSplitScreenMode(true)
                        recordSecurityEvent('split_screen', {
                            currentWidth,
                            currentHeight,
                            initialWidth: initialViewport.width,
                            initialHeight: initialViewport.height,
                            widthRatio: widthRatio.toFixed(2),
                            heightRatio: heightRatio.toFixed(2),
                            suspiciousResizeCount: suspiciousResizeCount.current
                        })
                        
                        toast.error('🚨 Split Screen Terdeteksi!', {
                            description: 'Penggunaan split screen tidak diizinkan selama ujian. Gunakan fullscreen mode.',
                            duration: 10000,
                        })
                    }
                } else if (Math.abs(widthRatio - 1) < 0.1 && Math.abs(heightRatio - 1) < 0.1) {
                    // Back to normal size, reset split screen mode
                    if (isSplitScreenMode) {
                        setIsSplitScreenMode(false)
                        suspiciousResizeCount.current = 0
                        toast.success('✅ Mode Fullscreen Dikembalikan', {
                            description: 'Terima kasih telah kembali ke mode fullscreen.',
                            duration: 3000,
                        })
                    }
                }
                
                recordSecurityEvent('viewport_change', {
                    currentWidth,
                    currentHeight,
                    widthRatio: widthRatio.toFixed(2),
                    heightRatio: heightRatio.toFixed(2),
                    isSplitScreen: significantReduction || suspiciousAspectRatio
                })
            }
        }

        // Detect orientation changes that might indicate split screen
        const handleOrientationChange = () => {
            setTimeout(() => { // Delay to get accurate viewport after orientation change
                const currentOrientation = window.screen?.orientation?.angle || 0
                const currentWidth = window.innerWidth
                const currentHeight = window.innerHeight
                
                if (lastOrientation.current !== null) {
                    const orientationDiff = Math.abs(currentOrientation - lastOrientation.current)
                    
                    // Check if viewport doesn't match expected orientation
                    const isPortrait = currentHeight > currentWidth
                    const isLandscape = currentWidth > currentHeight
                    const expectedPortrait = (currentOrientation === 0 || currentOrientation === 180)
                    const expectedLandscape = (currentOrientation === 90 || currentOrientation === 270)
                    
                    const orientationMismatch = (isPortrait && !expectedPortrait) || (isLandscape && !expectedLandscape)
                    
                    if (orientationMismatch && orientationDiff > 0) {
                        recordSecurityEvent('orientation_suspicious', {
                            orientationAngle: currentOrientation,
                            previousOrientation: lastOrientation.current,
                            viewportWidth: currentWidth,
                            viewportHeight: currentHeight,
                            isPortrait,
                            isLandscape,
                            expectedPortrait,
                            expectedLandscape
                        })
                        
                        toast.warning('⚠️ Orientasi Mencurigakan', {
                            description: 'Perubahan orientasi yang tidak wajar terdeteksi.',
                            duration: 5000,
                        })
                    }
                }
                
                lastOrientation.current = currentOrientation
            }, 100)
        }

        // Prevent pinch zoom on mobile
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault()
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault()
            }
        }

        // Prevent double-tap zoom
        const handleTouchEnd = (e: TouchEvent) => {
            const now = Date.now()
            if (now - (window as any).lastTouchEnd <= 300) {
                e.preventDefault()
            }
            (window as any).lastTouchEnd = now
        }

        // Add event listeners
        window.addEventListener('resize', handleResize)
        window.addEventListener('orientationchange', handleOrientationChange)
        document.addEventListener('touchstart', handleTouchStart, { passive: false })
        document.addEventListener('touchmove', handleTouchMove, { passive: false })
        document.addEventListener('touchend', handleTouchEnd, { passive: false })

        return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('orientationchange', handleOrientationChange)
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchmove', handleTouchMove)
            document.removeEventListener('touchend', handleTouchEnd)
        }
    }, [isExamActive, initialViewport, isSplitScreenMode, recordSecurityEvent])

    return {
        securityEvents,
        isWindowFocused,
        tabSwitchCount,
        isSplitScreenMode,
        totalViolationCount,
        recordSecurityEvent,
        // Methods to manually trigger security checks
        enableSecurity: () => {
            // This hook automatically enables security when isExamActive is true
        },
        disableSecurity: () => {
            // Security will be disabled when component unmounts or isExamActive is false
        },
        getSecurityReport: () => ({
            totalEvents: securityEvents.length,
            totalViolationCount,
            tabSwitches: securityEvents.filter(e => e.type === 'tab_switch').length,
            rightClicks: securityEvents.filter(e => e.type === 'right_click').length,
            forbiddenKeys: securityEvents.filter(e => e.type === 'key_combination').length,
            splitScreenDetections: securityEvents.filter(e => e.type === 'split_screen').length,
            viewportChanges: securityEvents.filter(e => e.type === 'viewport_change').length,
            orientationSuspicious: securityEvents.filter(e => e.type === 'orientation_suspicious').length,
            screenshotAttempts: securityEvents.filter(e => e.type === 'screenshot_attempt').length,
            currentlyFocused: isWindowFocused,
            isSplitScreenMode,
            isAntiScreenshotActive,
            screenshotTotalAttempts,
            screenshotRecentAttempts,
        }),
        // Anti-screenshot specific data
        screenshotAttempts,
        screenshotTotalAttempts,
        screenshotRecentAttempts,
        isAntiScreenshotActive
    }
}
