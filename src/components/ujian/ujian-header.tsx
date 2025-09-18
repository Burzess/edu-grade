"use client"

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Send } from 'lucide-react'

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
    return (
        <div className="bg-card shadow-sm border-b sticky top-0 z-10">
            <div className="container mx-auto px-3 sm:px-4 xl:px-8 py-2 sm:py-3 xl:py-4">
                <div className="flex items-center justify-between gap-2 xl:gap-6">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-base sm:text-lg xl:text-2xl font-semibold truncate">{ujian.name}</h1>
                        <p className="text-xs sm:text-sm xl:text-base text-muted-foreground truncate">
                            Guru: {ujian.profiles?.full_name}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 xl:gap-6 flex-shrink-0">
                        {/* Progress - Enhanced for desktop */}
                        <div className="hidden sm:block text-xs sm:text-sm xl:text-base text-center">
                            <div className="font-medium xl:font-semibold">{answeredCount}/{totalQuestions}</div>
                            <div className="text-muted-foreground">dijawab</div>
                        </div>

                        {/* Enhanced Timer */}
                        {timeLeft !== null && (
                            <div className={`
                                flex items-center gap-1 xl:gap-2 px-3 py-2 xl:px-4 xl:py-3 rounded-md xl:rounded-lg text-xs sm:text-sm xl:text-base font-bold
                                ${timeLeft < 300 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'}
                                shadow-sm xl:shadow-md
                            `}>
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 xl:h-5 xl:w-5" />
                                <span className="font-mono text-xs sm:text-sm xl:text-base">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onSubmit}
                            disabled={isSubmitting}
                            className="text-xs px-3 py-2 xl:px-4 xl:py-3 h-8 sm:h-9 xl:h-10 xl:text-sm border-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
                        >
                            <Send className="h-3 w-3 sm:h-4 sm:w-4 xl:h-4 xl:w-4 mr-1 xl:mr-2" />
                            <span className="hidden sm:inline">Kumpulkan</span>
                            <span className="sm:hidden">Submit</span>
                        </Button>
                    </div>
                </div>
                
                {/* Progress bar for small screens */}
                <div className="sm:hidden mt-2 flex items-center gap-2 text-xs">
                    <span>{answeredCount}/{totalQuestions} dijawab</span>
                    <div className="flex-1 bg-muted rounded-full h-1">
                        <div 
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${(answeredCount / Math.max(totalQuestions, 1)) * 100}%` }}
                        />
                    </div>
                </div>
                
                {/* Enhanced keyboard shortcuts info for desktop */}
                <div className="hidden xl:block absolute top-3 right-8 text-xs text-muted-foreground text-right bg-muted px-3 py-1 rounded-md border">
                    <div>⌨️ Shortcut: ← → Navigasi | 1 PG | 2 Essay</div>
                </div>
            </div>
        </div>
    )
})

UjianHeader.displayName = 'UjianHeader'
