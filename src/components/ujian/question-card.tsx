"use client"

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
    Clock,
    CheckCircle,
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Send,
} from 'lucide-react'

interface QuestionCardProps {
    soal: any
    index: number
    total: number
    answer: string
    onAnswerChange: (answer: string) => void
    onNext: () => void
    onPrev: () => void
    onSubmit: () => void
    isLast: boolean
    isFirst: boolean
    isSaving: boolean
    sectionType: 'multiple_choice' | 'essay'
    sectionIndex: number
    sectionTotal: number
}

export const QuestionCard = memo(({
    soal,
    index,
    total,
    answer,
    onAnswerChange,
    onNext,
    onPrev,
    onSubmit,
    isLast,
    isFirst,
    isSaving,
    sectionType,
    sectionIndex,
    sectionTotal
}: QuestionCardProps) => {
    const progressPercent = ((sectionIndex + 1) / sectionTotal) * 100

    return (
        <Card className="w-full shadow-sm border border-border/60 rounded-xl overflow-hidden">
            {/* Card Header - Compact */}
            <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className={`
                            flex items-center justify-center h-8 w-8 rounded-lg text-sm font-bold
                            ${sectionType === 'multiple_choice' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            }
                        `}>
                            {sectionIndex + 1}
                        </div>
                        <div>
                            <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                                {sectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                                Soal {sectionIndex + 1} dari {sectionTotal}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {answer.trim() ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                <CheckCircle className="h-3 w-3" />
                                Terjawab
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                                <AlertCircle className="h-3 w-3" />
                                Belum dijawab
                            </span>
                        )}
                    </div>
                </div>
                {/* Mini progress bar */}
                <div className="mt-3">
                    <Progress value={progressPercent} className="h-1" />
                </div>
            </CardHeader>

            <CardContent className="space-y-5 px-4 sm:px-6 pb-5 pt-3">
                {/* Question */}
                <div className="p-4 sm:p-5 bg-muted/50 rounded-xl border border-border/40">
                    <div className="text-foreground whitespace-pre-wrap text-sm sm:text-base leading-relaxed exam-question-text">
                        {soal.question_text}
                    </div>
                </div>

                {/* Answer Input */}
                <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        Jawaban Anda
                        <span className="text-xs text-muted-foreground font-normal">(boleh dikosongkan)</span>
                    </label>
                    {soal.question_type === 'essay' ? (
                        <Textarea
                            placeholder="Tulis jawaban Anda di sini dengan lengkap dan jelas..."
                            value={answer}
                            onChange={(e) => onAnswerChange(e.target.value)}
                            rows={6}
                            className="min-h-[150px] sm:min-h-[200px] text-sm sm:text-base leading-relaxed resize-none focus:ring-2 focus:ring-primary/30 border-border exam-answer-input"
                        />
                    ) : (
                        <div className="space-y-2">
                            {soal.options?.map((option: any, optIndex: number) => {
                                const optionId = option.id || option.label || `option-${optIndex}`
                                const isSelected = answer && optionId && String(answer).trim() === String(optionId).trim()
                                const optionLetter = option.label || String.fromCharCode(65 + optIndex)
                                
                                return (
                                    <label 
                                        key={optionId} 
                                        className={`
                                            flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                                            ${isSelected
                                                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20' 
                                                : 'border-border/60 bg-card hover:border-primary/30 hover:bg-muted/30'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 mt-0.5 transition-colors
                                            ${isSelected 
                                                ? 'bg-primary text-primary-foreground' 
                                                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                                            }
                                        `}>
                                            {optionLetter}
                                        </div>

                                        <input
                                            type="radio"
                                            name={`question-${soal.id}`}
                                            value={String(optionId)}
                                            checked={isSelected}
                                            onChange={(e) => onAnswerChange(e.target.value)}
                                            className="sr-only"
                                        />

                                        <span className={`
                                            text-sm sm:text-base leading-relaxed break-words flex-1
                                            ${isSelected ? 'text-foreground font-medium' : 'text-foreground/80'}
                                        `}>
                                            {option.text}
                                        </span>
                                    </label>
                                )
                            })}
                            
                            {answer && (
                                <button
                                    onClick={() => onAnswerChange('')}
                                    className="w-full p-2 mt-1 text-xs text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    Hapus Pilihan
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isFirst || isSaving}
                        className="flex items-center gap-2 px-4 py-2 text-sm h-9"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                    </Button>

                    <div className="text-xs text-muted-foreground text-center">
                        {sectionIndex + 1} / {sectionTotal}
                    </div>

                    {isLast ? (
                        <Button 
                            onClick={onSubmit} 
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 flex items-center gap-2 px-4 py-2 text-sm h-9 text-white"
                        >
                            <Send className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                {isSaving ? 'Menyimpan...' : 'Kumpulkan'}
                            </span>
                        </Button>
                    ) : (
                        <Button 
                            onClick={onNext} 
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm h-9"
                        >
                            <span className="hidden sm:inline">Selanjutnya</span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
})

// Add display name for ESLint
QuestionCard.displayName = 'QuestionCard'
