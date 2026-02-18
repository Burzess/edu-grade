"use client"

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Send, CheckCircle, BookOpen } from 'lucide-react'

interface UjianHeaderProps {
    ujian: any
    answeredCount: number
    totalQuestions: number
    timeLeft: number | null
    onSubmit: () => void
    isSubmitting: boolean
    formatTime: (seconds: number) => string
}

export const UjianHeader = memo(({
    ujian,
    answeredCount,
    totalQuestions,
    timeLeft,
    onSubmit,
    isSubmitting,
    formatTime
}: UjianHeaderProps) => {
    const progressPercent = (answeredCount / Math.max(totalQuestions, 1)) * 100
    const isTimeWarning = timeLeft !== null && timeLeft < 300
    const isTimeCritical = timeLeft !== null && timeLeft < 60

    return (
        <div className="bg-card/95 backdrop-blur-sm">
            <div className="container mx-auto px-3 sm:px-4 xl:px-6 py-2.5 sm:py-3">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Exam Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="hidden sm:flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                            <BookOpen className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base xl:text-lg font-semibold truncate leading-tight">{ujian.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground truncate">
                                    {ujian.profiles?.full_name}
                                </p>
                                {ujian.kelas_id && (
                                    <Badge 
                                        variant="secondary" 
                                        className="text-[10px] px-1.5 py-0 h-4 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300"
                                    >
                                        Kelas
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Progress, Timer, Submit */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Progress Badge */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border border-border/50">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs font-medium text-foreground">{answeredCount}/{totalQuestions}</span>
                        </div>

                        {/* Timer */}
                        {timeLeft !== null && (
                            <div className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300
                                ${isTimeCritical 
                                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30' 
                                    : isTimeWarning 
                                        ? 'bg-destructive/15 text-destructive border border-destructive/30' 
                                        : 'bg-primary/10 text-primary border border-primary/20'
                                }
                            `}>
                                <Clock className={`h-3.5 w-3.5 ${isTimeCritical ? 'animate-spin' : ''}`} />
                                <span className="font-mono tabular-nums">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className="text-xs h-8 px-3 sm:px-4 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        >
                            <Send className="h-3.5 w-3.5 sm:mr-1.5" />
                            <span className="hidden sm:inline">Kumpulkan</span>
                        </Button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-green-500 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium sm:hidden">
                        {answeredCount}/{totalQuestions}
                    </span>
                </div>
            </div>
        </div>
    )
})

UjianHeader.displayName = 'UjianHeader'
