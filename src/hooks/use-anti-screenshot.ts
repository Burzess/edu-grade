"use client"

import { useEffect, useCallback, useState, useRef } from 'react'

interface UseAntiScreenshotOptions {
    isActive?: boolean
    onScreenshotAttempt?: (method: 'printscreen' | 'keyboard_shortcut' | 'browser_api' | 'touch_gesture', details?: any) => void
    enableKeyboardBlocking?: boolean
    enableAPIBlocking?: boolean
    enableTouchBlocking?: boolean
    enableVisibilityProtection?: boolean
}

interface ScreenshotAttempt {
    method: 'printscreen' | 'keyboard_shortcut' | 'browser_api' | 'touch_gesture'
    timestamp: Date
    details?: any
    blocked: boolean
}

/**
 * Custom hook untuk mencegah screenshot dan screen capture
 * Mendukung desktop dan mobile dengan berbagai metode deteksi
 */
export function useAntiScreenshot(options: UseAntiScreenshotOptions = {}) {
    const {
        isActive = true,
        onScreenshotAttempt,
        enableKeyboardBlocking = true,
        enableAPIBlocking = true,
        enableTouchBlocking = true,
        enableVisibilityProtection = true
    } = options

    const [screenshotAttempts, setScreenshotAttempts] = useState<ScreenshotAttempt[]>([])
    const [isProtectionActive, setIsProtectionActive] = useState(false)
    const lastKeyPressTime = useRef<number>(0)
    const consecutiveScreenshotAttempts = useRef<number>(0)
    const totalViolationAttempts = useRef<number>(0) // Track all security violations

    // Function untuk mencatat percobaan screenshot
    const recordScreenshotAttempt = useCallback((
        method: ScreenshotAttempt['method'], 
        details?: any, 
        blocked: boolean = true
    ) => {
        const attempt: ScreenshotAttempt = {
            method,
            timestamp: new Date(),
            details,
            blocked
        }
        
        setScreenshotAttempts(prev => [...prev, attempt])
        consecutiveScreenshotAttempts.current += 1
        totalViolationAttempts.current += 1
        
        // Notify parent component
        onScreenshotAttempt?.(method, { 
            ...details, 
            blocked, 
            attemptCount: consecutiveScreenshotAttempts.current,
            totalViolations: totalViolationAttempts.current
        })
        
        // Log untuk debugging
        console.warn(`🚫 Screenshot Attempt Blocked: ${method}`, attempt)
        
        // Reset counter setelah beberapa detik jika tidak ada percobaan lagi
        setTimeout(() => {
            consecutiveScreenshotAttempts.current = Math.max(0, consecutiveScreenshotAttempts.current - 1)
        }, 10000)
        
        return attempt
    }, [onScreenshotAttempt])

    // 1. Keyboard Screenshot Prevention
    useEffect(() => {
        if (!isActive || !enableKeyboardBlocking) return

        const handleKeyDown = (event: KeyboardEvent) => {
            const now = Date.now()
            const timeSinceLastKey = now - lastKeyPressTime.current
            lastKeyPressTime.current = now

            // Deteksi berbagai kombinasi tombol untuk screenshot
            const screenshotKeyDetected = 
                // Print Screen key
                event.key === 'PrintScreen' ||
                event.keyCode === 44 || // PrintScreen keyCode
                // Windows + Print Screen
                (event.metaKey && event.key === 'PrintScreen') ||
                // Alt + Print Screen (screenshot window aktif)
                (event.altKey && event.key === 'PrintScreen') ||
                // Shift + Cmd + 3 (macOS full screen)
                (event.shiftKey && event.metaKey && event.key === '3') ||
                // Shift + Cmd + 4 (macOS area selection)
                (event.shiftKey && event.metaKey && event.key === '4') ||
                // Shift + Cmd + 5 (macOS screenshot toolbar)
                (event.shiftKey && event.metaKey && event.key === '5') ||
                // Ctrl + Shift + S (beberapa screenshot tools)
                (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') ||
                // Windows + Shift + S (Windows snipping tool)
                (event.metaKey && event.shiftKey && event.key.toLowerCase() === 's') ||
                // Windows + G (Xbox Game Bar - bisa screenshot)
                (event.metaKey && event.key.toLowerCase() === 'g') ||
                // F1 key (kadang digunakan screenshot di beberapa aplikasi)
                (event.ctrlKey && event.key === 'F1') ||
                // Browser screenshot extensions (contoh: Awesome Screenshot - Alt+Shift+S)
                (event.altKey && event.shiftKey && event.key.toLowerCase() === 's')

            if (screenshotKeyDetected) {
                event.preventDefault()
                event.stopPropagation()
                event.stopImmediatePropagation()
                
                recordScreenshotAttempt('keyboard_shortcut', {
                    key: event.key,
                    keyCode: event.keyCode,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey,
                    timeSinceLastKey
                })
                
                return false
            }

            // Deteksi rapid key combination yang mencurigakan
            if (timeSinceLastKey < 100 && (event.ctrlKey || event.altKey || event.metaKey)) {
                recordScreenshotAttempt('keyboard_shortcut', {
                    key: event.key,
                    suspiciousRapidCombination: true,
                    timeSinceLastKey
                })
            }
        }

        const handleKeyUp = (event: KeyboardEvent) => {
            // Tangkap key up untuk Print Screen juga
            if (event.key === 'PrintScreen' || event.keyCode === 44) {
                event.preventDefault()
                recordScreenshotAttempt('printscreen', {
                    keyUp: true,
                    timestamp: new Date()
                })
                return false
            }
        }

        document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })
        document.addEventListener('keyup', handleKeyUp, { capture: true, passive: false })
        window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false })
        window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false })

        return () => {
            document.removeEventListener('keydown', handleKeyDown, { capture: true })
            document.removeEventListener('keyup', handleKeyUp, { capture: true })
            window.removeEventListener('keydown', handleKeyDown, { capture: true })
            window.removeEventListener('keyup', handleKeyUp, { capture: true })
        }
    }, [isActive, enableKeyboardBlocking, recordScreenshotAttempt])

    // 2. Browser API Screenshot Prevention
    useEffect(() => {
        if (!isActive || !enableAPIBlocking) return

        // Intercept clipboard API yang bisa digunakan untuk screenshot
        const originalWriteText = navigator.clipboard?.writeText
        const originalWrite = navigator.clipboard?.write

        if (navigator.clipboard && originalWriteText) {
            navigator.clipboard.writeText = async function(text: string) {
                recordScreenshotAttempt('browser_api', {
                    api: 'clipboard.writeText',
                    textLength: text.length,
                    blocked: false // Tidak bisa diblokir sepenuhnya, hanya dicatat
                })
                return originalWriteText.call(this, text)
            }
        }

        if (navigator.clipboard && originalWrite) {
            navigator.clipboard.write = async function(data: ClipboardItems) {
                recordScreenshotAttempt('browser_api', {
                    api: 'clipboard.write',
                    itemsCount: data.length,
                    blocked: false // Tidak bisa diblokir sepenuhnya, hanya dicatat
                })
                return originalWrite.call(this, data)
            }
        }

        // Monitor HTML5 Canvas API (bisa digunakan untuk screenshot)
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
            recordScreenshotAttempt('browser_api', {
                api: 'canvas.toDataURL',
                arguments: args,
                canvasSize: { width: this.width, height: this.height }
            })
            // Biarkan tetap jalan tapi catat aktivitynya
            return originalToDataURL.apply(this, args)
        }

        // Monitor getImageData API
        const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            recordScreenshotAttempt('browser_api', {
                api: 'context.getImageData',
                arguments: args
            })
            return originalGetImageData.apply(this, args)
        }

        return () => {
            // Restore original functions
            if (navigator.clipboard && originalWriteText) {
                navigator.clipboard.writeText = originalWriteText
            }
            if (navigator.clipboard && originalWrite) {
                navigator.clipboard.write = originalWrite
            }
            HTMLCanvasElement.prototype.toDataURL = originalToDataURL
            CanvasRenderingContext2D.prototype.getImageData = originalGetImageData
        }
    }, [isActive, enableAPIBlocking, recordScreenshotAttempt])

    // 3. Mobile Touch Gesture Prevention
    useEffect(() => {
        if (!isActive || !enableTouchBlocking) return

        // Deteksi gesture screenshot di mobile
        const handleTouchStart = (event: TouchEvent) => {
            if (event.touches.length >= 3) {
                // 3+ finger gesture bisa jadi screenshot
                recordScreenshotAttempt('touch_gesture', {
                    touchCount: event.touches.length,
                    gestureType: 'multi_finger_touch'
                })
            }
        }

        // Deteksi kombinasi tombol fisik + touch (Android screenshot biasa)
        const handleTouchEnd = (event: TouchEvent) => {
            const now = Date.now()
            
            // Jika ada touch bersamaan dengan key press dalam waktu dekat
            if (now - lastKeyPressTime.current < 500) {
                recordScreenshotAttempt('touch_gesture', {
                    suspiciousTimingWithKeyPress: true,
                    timeSinceKeyPress: now - lastKeyPressTime.current
                })
            }
        }

        // Deteksi gesture swipe cepat dari edge (beberapa launcher Android)
        const handleTouchMove = (event: TouchEvent) => {
            if (event.touches.length === 1) {
                const touch = event.touches[0]
                const isFromEdge = touch.clientX < 50 || touch.clientX > window.innerWidth - 50 ||
                                 touch.clientY < 50 || touch.clientY > window.innerHeight - 50
                
                if (isFromEdge) {
                    recordScreenshotAttempt('touch_gesture', {
                        gestureType: 'edge_swipe',
                        startPosition: { x: touch.clientX, y: touch.clientY },
                        blocked: false // Sulit diblokir tanpa mengganggu navigasi normal
                    })
                }
            }
        }

        document.addEventListener('touchstart', handleTouchStart, { passive: false })
        document.addEventListener('touchend', handleTouchEnd, { passive: true })
        document.addEventListener('touchmove', handleTouchMove, { passive: true })

        return () => {
            document.removeEventListener('touchstart', handleTouchStart)
            document.removeEventListener('touchend', handleTouchEnd)
            document.removeEventListener('touchmove', handleTouchMove)
        }
    }, [isActive, enableTouchBlocking, recordScreenshotAttempt])

    // 4. CSS Protection untuk membuat konten tidak bisa di-screenshot dengan jelas
    useEffect(() => {
        if (!isActive || !enableVisibilityProtection) return

        const style = document.createElement('style')
        style.id = 'anti-screenshot-protection'
        style.textContent = `
            /* Base protection - membuat elemen penting blur saat screenshot */
            .exam-content {
                /* Watermark overlay untuk mempersulit screenshot */
                position: relative;
            }
            
            .exam-content::before {
                content: "UJIAN ONLINE - DILARANG SCREENSHOT";
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 100px,
                    rgba(255, 0, 0, 0.03) 100px,
                    rgba(255, 0, 0, 0.03) 120px
                );
                pointer-events: none;
                z-index: 999999;
                mix-blend-mode: multiply;
                font-size: 12px;
                color: rgba(255, 0, 0, 0.1);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* Proteksi tambahan - blur content saat tidak focus */
            .exam-content.window-blurred {
                filter: blur(5px) brightness(0.3);
                transition: filter 0.3s ease;
            }

            /* Prevent screenshot via CSS (tidak 100% efektif tapi membantu) */
            .exam-question-text {
                /* -webkit-user-select: none; */
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
                /* text-shadow: 0 0 5px rgba(0,0,0,0.1); */
                /* background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%); */
            }

            /* Mobile specific protection */
            @media (max-width: 768px) {
                .exam-content::before {
                    font-size: 10px;
                    opacity: 0.7;
                }
            }

            /* Print protection */
            @media print {
                .exam-content {
                    display: none !important;
                }
                body::before {
                    content: "DOKUMEN TIDAK DAPAT DICETAK - UJIAN ONLINE";
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 24px;
                    color: red;
                    font-weight: bold;
                }
            }
        `
        
        document.head.appendChild(style)
        setIsProtectionActive(true)

        // Tambahkan class ke body untuk watermark
        document.body.classList.add('anti-screenshot-protection')
        
        return () => {
            const existingStyle = document.getElementById('anti-screenshot-protection')
            if (existingStyle) {
                document.head.removeChild(existingStyle)
            }
            document.body.classList.remove('anti-screenshot-protection')
            setIsProtectionActive(false)
        }
    }, [isActive, enableVisibilityProtection])

    // 5. Monitor untuk window blur (bisa indikasi screenshot app external)
    useEffect(() => {
        if (!isActive) return

        const handleWindowBlur = () => {
            document.querySelectorAll('.exam-content').forEach(el => {
                el.classList.add('window-blurred')
            })
            
            recordScreenshotAttempt('browser_api', {
                event: 'window_blur',
                suspiciousActivity: 'possible_external_screenshot_app'
            })
        }

        const handleWindowFocus = () => {
            document.querySelectorAll('.exam-content').forEach(el => {
                el.classList.remove('window-blurred')
            })
        }

        window.addEventListener('blur', handleWindowBlur)
        window.addEventListener('focus', handleWindowFocus)

        return () => {
            window.removeEventListener('blur', handleWindowBlur)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [isActive, recordScreenshotAttempt])

    // Public methods
    const getProtectionStatus = useCallback(() => ({
        isActive,
        isProtectionActive,
        totalAttempts: screenshotAttempts.length,
        recentAttempts: screenshotAttempts.filter(
            attempt => Date.now() - attempt.timestamp.getTime() < 60000 // Last minute
        ).length,
        methodsEnabled: {
            keyboard: enableKeyboardBlocking,
            api: enableAPIBlocking,
            touch: enableTouchBlocking,
            visibility: enableVisibilityProtection
        }
    }), [isActive, isProtectionActive, screenshotAttempts, enableKeyboardBlocking, enableAPIBlocking, enableTouchBlocking, enableVisibilityProtection])

    const getDetailedReport = useCallback(() => ({
        attempts: screenshotAttempts,
        summary: {
            total: screenshotAttempts.length,
            blocked: screenshotAttempts.filter(a => a.blocked).length,
            byMethod: {
                printscreen: screenshotAttempts.filter(a => a.method === 'printscreen').length,
                keyboard: screenshotAttempts.filter(a => a.method === 'keyboard_shortcut').length,
                browserApi: screenshotAttempts.filter(a => a.method === 'browser_api').length,
                touchGesture: screenshotAttempts.filter(a => a.method === 'touch_gesture').length
            }
        }
    }), [screenshotAttempts])

    return {
        screenshotAttempts,
        isProtectionActive,
        recordScreenshotAttempt,
        getProtectionStatus,
        getDetailedReport,
        
        // Statistics
        totalAttempts: screenshotAttempts.length,
        recentAttempts: screenshotAttempts.filter(
            attempt => Date.now() - attempt.timestamp.getTime() < 60000
        ).length,
        consecutiveAttempts: consecutiveScreenshotAttempts.current
    }
}

export type { UseAntiScreenshotOptions, ScreenshotAttempt }