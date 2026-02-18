"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ShieldAlert, 
    Camera, 
    AlertTriangle, 
    Eye, 
    Smartphone,
    Monitor,
    X
} from 'lucide-react'

interface ScreenshotWarningProps {
    isVisible: boolean
    onClose: () => void
    warningType: 'keyboard' | 'touch' | 'api' | 'multiple'
    attemptCount?: number
    details?: {
        method?: string
        deviceType?: 'desktop' | 'mobile'
        severity?: 'low' | 'medium' | 'high' | 'critical'
    }
}

/**
 * Komponen overlay peringatan yang muncul ketika terdeteksi percobaan screenshot
 * Menampilkan peringatan visual yang jelas namun tidak mengganggu aksesibilitas
 */
export function ScreenshotWarningOverlay({ 
    isVisible, 
    onClose, 
    warningType,
    attemptCount = 1,
    details = {}
}: ScreenshotWarningProps) {
    const [countdown, setCountdown] = useState(5)
    const { method, deviceType = 'desktop', severity = 'medium' } = details

    // Auto close dengan countdown
    useEffect(() => {
        if (!isVisible) return

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    onClose()
                    return 5
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [isVisible, onClose])

    // Reset countdown saat overlay muncul lagi
    useEffect(() => {
        if (isVisible) {
            setCountdown(5)
        }
    }, [isVisible])

    const getWarningConfig = () => {
        switch (warningType) {
            case 'keyboard':
                return {
                    icon: <Monitor className="w-16 h-16" />,
                    title: "Screenshot Keyboard Terdeteksi!",
                    message: "Penggunaan tombol screenshot tidak diizinkan",
                    color: "text-red-500",
                    bgColor: "bg-red-500/90",
                    iconColor: "text-red-100"
                }
            case 'touch':
                return {
                    icon: <Smartphone className="w-16 h-16" />,
                    title: "Screenshot Gesture Terdeteksi!",
                    message: "Gesture screenshot pada perangkat mobile tidak diizinkan",
                    color: "text-orange-500",
                    bgColor: "bg-orange-500/90",
                    iconColor: "text-orange-100"
                }
            case 'api':
                return {
                    icon: <Camera className="w-16 h-16" />,
                    title: "Aktivitas Screenshot API Terdeteksi!",
                    message: "Penggunaan aplikasi atau ekstensi screenshot tidak diizinkan",
                    color: "text-purple-500",
                    bgColor: "bg-purple-500/90",
                    iconColor: "text-purple-100"
                }
            case 'multiple':
                return {
                    icon: <ShieldAlert className="w-16 h-16" />,
                    title: "Beberapa Percobaan Screenshot!",
                    message: "Terdeteksi multiple percobaan screenshot",
                    color: "text-red-600",
                    bgColor: "bg-red-600/90",
                    iconColor: "text-red-100"
                }
            default:
                return {
                    icon: <AlertTriangle className="w-16 h-16" />,
                    title: "Peringatan Keamanan!",
                    message: "Aktivitas mencurigakan terdeteksi",
                    color: "text-yellow-500",
                    bgColor: "bg-yellow-500/90",
                    iconColor: "text-yellow-100"
                }
        }
    }

    const config = getWarningConfig()
    const isHighSeverity = severity === 'high' || severity === 'critical'
    const showMultipleAttemptWarning = attemptCount >= 3

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    role="alert"
                    aria-live="assertive"
                    aria-labelledby="screenshot-warning-title"
                    aria-describedby="screenshot-warning-description"
                >
                    {/* Main Warning Card */}
                    <motion.div
                        initial={{ scale: 0.8, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, y: 50 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className={`relative max-w-md w-full mx-4 ${config.bgColor} backdrop-blur-md rounded-2xl shadow-2xl border border-white/20`}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Tutup peringatan"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Content */}
                        <div className="p-8 text-center text-white">
                            {/* Animated Icon */}
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ 
                                    duration: 2, 
                                    repeat: Infinity,
                                    repeatType: "reverse"
                                }}
                                className={`inline-flex items-center justify-center w-20 h-20 mb-6 ${config.iconColor} bg-white/20 rounded-full`}
                            >
                                {config.icon}
                            </motion.div>

                            {/* Title */}
                            <h2 
                                id="screenshot-warning-title"
                                className="text-2xl font-bold mb-4 leading-tight"
                            >
                                🚨 {config.title}
                            </h2>

                            {/* Main Message */}
                            <p 
                                id="screenshot-warning-description"
                                className="text-lg mb-4 opacity-90 leading-relaxed"
                            >
                                {config.message}
                            </p>

                            {/* Additional Details */}
                            <div className="bg-white/10 rounded-lg p-4 mb-6 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="opacity-80">Percobaan ke:</span>
                                        <span className="font-semibold">{attemptCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-80">Perangkat:</span>
                                        <span className="font-semibold">
                                            {deviceType === 'mobile' ? '📱 Mobile' : '💻 Desktop'}
                                        </span>
                                    </div>
                                    {method && (
                                        <div className="flex justify-between">
                                            <span className="opacity-80">Metode:</span>
                                            <span className="font-semibold capitalize">{method}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Severity-based additional warnings */}
                            {isHighSeverity && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/20 border border-red-300/30 rounded-lg p-3 mb-4"
                                >
                                    <div className="flex items-center gap-2 text-red-100">
                                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-medium">
                                            Peringatan Tinggi: Aktivitas ini akan dilaporkan ke pengawas ujian
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Multiple attempt warning */}
                            {showMultipleAttemptWarning && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-red-600/30 border border-red-400/40 rounded-lg p-3 mb-4"
                                >
                                    <div className="flex items-center gap-2 text-red-100">
                                        <Eye className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-semibold">
                                            Multiple percobaan terdeteksi! Ujian Anda sedang dipantau ketat.
                                        </span>
                                    </div>
                                </motion.div>
                            )}

                            {/* Instructions */}
                            <div className="text-white/90 text-sm leading-relaxed space-y-2">
                                <p className="font-medium">📋 Yang Harus Dilakukan:</p>
                                <ul className="text-left space-y-1 pl-4">
                                    <li>• Jangan mencoba screenshot lagi</li>
                                    <li>• Fokus pada penyelesaian ujian</li>
                                    <li>• Gunakan hanya fitur yang disediakan</li>
                                    {deviceType === 'mobile' && (
                                        <li>• Hindari gesture screenshot di perangkat</li>
                                    )}
                                </ul>
                            </div>

                            {/* Auto-close countdown */}
                            <div className="mt-6 pt-4 border-t border-white/20">
                                <p className="text-sm opacity-80">
                                    Peringatan ini akan otomatis tertutup dalam{' '}
                                    <motion.span
                                        key={countdown}
                                        initial={{ scale: 1.2 }}
                                        animate={{ scale: 1 }}
                                        className="font-bold text-lg"
                                    >
                                        {countdown}
                                    </motion.span>{' '}
                                    detik
                                </p>
                                
                                {/* Progress bar */}
                                <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                                    <motion.div
                                        initial={{ width: "100%" }}
                                        animate={{ width: "0%" }}
                                        transition={{ duration: 5, ease: "linear" }}
                                        className="bg-white h-2 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Background tap to close */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 -z-10"
                        onClick={onClose}
                        aria-label="Klik untuk menutup peringatan"
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

/**
 * Komponen toast notification ringan untuk peringatan screenshot
 * Digunakan untuk peringatan yang lebih subtle
 */
interface ScreenshotToastProps {
    isVisible: boolean
    onClose: () => void
    message: string
    type?: 'warning' | 'error' | 'info'
    duration?: number
}

export function ScreenshotToast({ 
    isVisible, 
    onClose, 
    message, 
    type = 'warning', 
    duration = 3000 
}: ScreenshotToastProps) {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(onClose, duration)
            return () => clearTimeout(timer)
        }
    }, [isVisible, onClose, duration])

    const getTypeConfig = () => {
        switch (type) {
            case 'error':
                return {
                    bgColor: 'bg-red-500',
                    icon: <ShieldAlert className="w-5 h-5" />,
                    emoji: '🚨'
                }
            case 'info':
                return {
                    bgColor: 'bg-brand-500',
                    icon: <Eye className="w-5 h-5" />,
                    emoji: 'ℹ️'
                }
            default:
                return {
                    bgColor: 'bg-orange-500',
                    icon: <AlertTriangle className="w-5 h-5" />,
                    emoji: '⚠️'
                }
        }
    }

    const config = getTypeConfig()

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -100, scale: 0.9 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className={`fixed top-4 right-4 z-[9999] ${config.bgColor} text-white px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border border-white/20 max-w-sm`}
                    role="alert"
                    aria-live="polite"
                >
                    <div className="flex items-start gap-3">
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex-shrink-0 text-2xl"
                        >
                            {config.emoji}
                        </motion.div>
                        
                        <div className="flex-1">
                            <p className="text-sm font-medium leading-relaxed">{message}</p>
                        </div>
                        
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded transition-colors"
                            aria-label="Tutup notifikasi"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress indicator */}
                    {duration > 0 && (
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: duration / 1000, ease: "linear" }}
                            className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export type { ScreenshotWarningProps, ScreenshotToastProps }