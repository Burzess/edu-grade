"use client"

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Grid3X3 } from 'lucide-react'

interface QuestionNavigatorProps {
    questions: any[]
    currentIndex: number
    answers: { [key: string]: string }
    onQuestionSelect: (index: number) => void
    sectionType: 'multiple_choice' | 'essay'
    isOpen: boolean
    onToggle: () => void
}

export const QuestionNavigator = memo(({ 
    questions, 
    currentIndex, 
    answers, 
    onQuestionSelect, 
    sectionType,
    isOpen,
    onToggle 
}: QuestionNavigatorProps) => {
    return (
        <>
            {/* Mobile Toggle Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className={`fixed bottom-4 right-3 z-[60] xl:hidden shadow-md p-2.5 h-10 w-10 rounded-full transition-opacity duration-300 ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <Grid3X3 className="h-4 w-4" />
            </Button>

            {/* Navigator Panel */}
            <div className={`
                fixed top-0 right-0 h-full bg-card border-l border-border shadow-xl z-[55] transition-transform duration-300
                w-64 sm:w-72 xl:w-full
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                xl:translate-x-0 xl:relative xl:shadow-none xl:z-10 xl:bg-transparent xl:border-l-0
            `}>
                <div className="p-3 sm:p-4 border-b border-border/60 bg-card">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${sectionType === 'multiple_choice' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            <h3 className="font-medium text-sm text-foreground">
                                {sectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}
                            </h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className="xl:hidden p-1 h-7 w-7"
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {questions.length} soal
                    </div>
                </div>

                <div className="p-3 sm:p-4 h-full overflow-y-auto pb-20">
                    <div className="grid grid-cols-5 gap-1.5">
                        {questions.map((question, index) => {
                            const isAnswered = answers[question.soal?.id]?.trim()
                            const isCurrent = index === currentIndex
                            
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onQuestionSelect(index)
                                        onToggle()
                                    }}
                                    className={`
                                        w-full aspect-square rounded-lg border text-xs font-semibold transition-all duration-150 relative
                                        ${isCurrent 
                                            ? 'border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20' 
                                            : isAnswered
                                                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100'
                                                : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
                                        }
                                    `}
                                >
                                    {index + 1}
                                    {isAnswered && !isCurrent && (
                                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-card" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Legend */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="text-xs text-muted-foreground space-y-1.5">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-primary rounded border-2 border-primary"></div>
                                <span>Saat ini</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-300 dark:border-green-700 relative">
                                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                </div>
                                <span>Sudah dijawab</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-card rounded border border-border"></div>
                                <span>Belum dijawab</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-[50] xl:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    )
})

// Add display name for ESLint
QuestionNavigator.displayName = 'QuestionNavigator'
