"use client"

import { useEffect, useCallback, useState, useRef } from 'react'
import { toast } from 'sonner'

interface UseExamSecurityOptions {
    isExamActive?: boolean
    onSecurityViolation?: (violationType: string, details?: any) => void
    enableAntiCheating?: boolean
    enableBeforeUnload?: boolean
    enableFocusDetection?: boolean
    enableTextSelection?: boolean
    examTitle?: string
}

interface SecurityEvent {
    type: 'tab_switch' | 'window_blur' | 'before_unload' | 'text_selection' | 'right_click' | 'key_combination' | 'split_screen' | 'viewport_change' | 'orientation_suspicious'
    timestamp: Date
    details?: any
}

export function useExamSecurity(options: UseExamSecurityOptions = {}) {
    const {
        isExamActive = true,
        onSecurityViolation,
        enableAntiCheating = true,
        enableBeforeUnload = true,
        enableFocusDetection = true,
        enableTextSelection = true,
        examTitle = 'Ujian'
    } = options

    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
    const [isWindowFocused, setIsWindowFocused] = useState(true)
    const [tabSwitchCount, setTabSwitchCount] = useState(0)
    const [isSplitScreenMode, setIsSplitScreenMode] = useState(false)
    const [initialViewport, setInitialViewport] = useState<{width: number, height: number} | null>(null)
    const lastVisibilityChange = useRef<Date>(new Date())
    const focusWarningShown = useRef(false)
    const lastOrientation = useRef<number | null>(null)
    const suspiciousResizeCount = useRef(0)

    // Function untuk mencatat event keamanan
    const recordSecurityEvent = useCallback((type: SecurityEvent['type'], details?: any) => {
        const event: SecurityEvent = {
            type,
            timestamp: new Date(),
            details
        }
        
        setSecurityEvents(prev => [...prev, event])
        onSecurityViolation?.(type, details)
        
        // Log ke console untuk debugging
        console.warn(`🚨 Security Event: ${type}`, event)
    }, [onSecurityViolation])

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

    // Window focus detection
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
                
                recordSecurityEvent('tab_switch', { 
                    action: 'left',
                    tabSwitchCount: tabSwitchCount + 1
                })
                
                // Show warning toast
                if (!focusWarningShown.current) {
                    toast.error('⚠️ Anda meninggalkan halaman ujian!', {
                        description: 'Kembali ke halaman ujian sekarang. Aktivitas ini akan dicatat.',
                        duration: 10000,
                    })
                    focusWarningShown.current = true
                }
            } else {
                // User returned to tab
                setIsWindowFocused(true)
                const timeAway = now.getTime() - lastVisibilityChange.current.getTime()
                
                recordSecurityEvent('tab_switch', { 
                    action: 'returned',
                    timeAwayMs: timeAway,
                    tabSwitchCount: tabSwitchCount
                })
                
                if (timeAway > 5000) { // If away for more than 5 seconds
                    toast.warning(`Anda meninggalkan ujian selama ${Math.round(timeAway/1000)} detik`, {
                        description: 'Aktivitas ini telah dicatat. Jangan keluar dari halaman ujian lagi.',
                    })
                }
                
                // Reset warning flag after a delay
                setTimeout(() => {
                    focusWarningShown.current = false
                }, 3000)
            }
        }

        const handleWindowBlur = () => {
            recordSecurityEvent('window_blur', { timestamp: new Date() })
        }

        const handleWindowFocus = () => {
            setIsWindowFocused(true)
        }

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('blur', handleWindowBlur)
        window.addEventListener('focus', handleWindowFocus)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('blur', handleWindowBlur)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [isExamActive, enableFocusDetection, recordSecurityEvent, tabSwitchCount])

    // Before unload warning
    useEffect(() => {
        if (!isExamActive || !enableBeforeUnload) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
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
    }, [isExamActive, enableBeforeUnload, examTitle, recordSecurityEvent])

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
            tabSwitches: securityEvents.filter(e => e.type === 'tab_switch').length,
            rightClicks: securityEvents.filter(e => e.type === 'right_click').length,
            forbiddenKeys: securityEvents.filter(e => e.type === 'key_combination').length,
            splitScreenDetections: securityEvents.filter(e => e.type === 'split_screen').length,
            viewportChanges: securityEvents.filter(e => e.type === 'viewport_change').length,
            orientationSuspicious: securityEvents.filter(e => e.type === 'orientation_suspicious').length,
            currentlyFocused: isWindowFocused,
            isSplitScreenMode,
        })
    }
}