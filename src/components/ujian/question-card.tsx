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
    return (
        <Card className="w-full shadow-sm border-0 xl:border xl:shadow-md">
            <CardHeader className="pb-3 sm:pb-4 xl:pb-6 px-4 sm:px-6 xl:px-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl xl:text-2xl flex items-center gap-2 xl:gap-3">
                            {sectionType === 'multiple_choice' ? '📝' : '✍️'}
                            <span>{sectionType === 'multiple_choice' ? 'PILIHAN GANDA' : 'ESSAY'}</span>
                        </CardTitle>
                        <CardDescription className="text-sm sm:text-base xl:text-lg mt-1">
                            Soal {sectionIndex + 1} dari {sectionTotal} ({sectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'})
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 sm:text-right">
                        <div className="text-xs sm:text-sm xl:text-base text-muted-foreground">
                            Progress: {index + 1}/{total}
                        </div>
                        <Progress value={((index + 1) / total) * 100} className="w-20 sm:w-24 xl:w-32" />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6 xl:space-y-8 px-4 sm:px-6 xl:px-8">
                {/* Question - Improved desktop styling */}
                <div className="p-4 sm:p-6 xl:p-8 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg xl:rounded-2xl border border-primary/20">
                    <div className="font-semibold mb-3 xl:mb-4 text-primary text-sm sm:text-base xl:text-lg">
                        Pertanyaan:
                    </div>
                    <div className="text-foreground whitespace-pre-wrap text-sm sm:text-base xl:text-lg leading-relaxed xl:leading-loose">
                        {soal.question_text}
                    </div>
                </div>

                {/* Answer Input - Enhanced for desktop */}
                <div className="space-y-3 sm:space-y-4 xl:space-y-6">
                    <label className="text-sm sm:text-base xl:text-lg font-semibold text-foreground">
                        Jawaban Anda: <span className="text-xs xl:text-sm text-muted-foreground font-normal">(Opsional - boleh dikosongkan)</span>
                    </label>
                    {soal.question_type === 'essay' ? (
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Tulis jawaban Anda di sini dengan lengkap dan jelas... (Boleh dikosongkan jika tidak yakin)"
                                value={answer}
                                onChange={(e) => onAnswerChange(e.target.value)}
                                rows={6}
                                className="min-h-[150px] sm:min-h-[200px] xl:min-h-[250px] text-sm sm:text-base xl:text-lg leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 border-2"
                            />
                        </div>
                    ) : (
                        // Multiple choice options - Enhanced for desktop
                        <div className="space-y-2 sm:space-y-3 xl:space-y-4">
                            {soal.options?.map((option: any, optIndex: number) => {
                                // Use label as the identifier since that's what the data structure has
                                const optionId = option.id || option.label || `option-${optIndex}`
                                const isSelected = answer && optionId && String(answer).trim() === String(optionId).trim()
                                
                                return (
                                    <label 
                                        key={optionId} 
                                        className={`
                                            flex items-start space-x-3 xl:space-x-4 p-3 sm:p-4 xl:p-5 rounded-lg xl:rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                                            ${isSelected
                                                ? 'border-primary bg-primary/5 shadow-md' 
                                                : 'border-border bg-card hover:border-border/60 hover:shadow-sm'
                                            }
                                        `}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${soal.id}`}
                                            value={String(optionId)}
                                            checked={isSelected}
                                            onChange={(e) => onAnswerChange(e.target.value)}
                                            className="mt-0.5 sm:mt-1 w-4 h-4 xl:w-5 xl:h-5 text-primary border-border focus:ring-primary flex-shrink-0"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <span className={`
                                                font-semibold mr-2 xl:mr-3 text-sm sm:text-base xl:text-lg
                                                ${isSelected ? 'text-primary' : 'text-muted-foreground'}
                                            `}>
                                                {option.label || String.fromCharCode(65 + optIndex)}.
                                            </span>
                                            <span className={`
                                                text-sm sm:text-base xl:text-lg leading-relaxed xl:leading-loose break-words
                                                ${isSelected ? 'text-primary' : 'text-foreground'}
                                            `}>
                                                {option.text}
                                            </span>
                                        </div>
                                    </label>
                                )
                            })}
                            
                            {/* Clear selection option - Enhanced */}
                            {answer && (
                                <button
                                    onClick={() => onAnswerChange('')}
                                    className="w-full p-2 mt-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    🗑️ Hapus Pilihan (Kosongkan Jawaban)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation - Enhanced desktop layout */}
                <div className="flex items-center justify-between pt-6 xl:pt-8 border-t border-gray-200">
                    <Button
                        variant="outline"
                        onClick={onPrev}
                        disabled={isFirst || isSaving}
                        className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base"
                    >
                        <ArrowLeft className="h-4 w-4 xl:h-5 xl:w-5" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                        <span className="sm:hidden">Prev</span>
                    </Button>

                    <div className="flex flex-col items-center gap-1 xl:gap-2 text-center px-2">
                        {/* Answer status */}
                        {answer.trim() ? (
                            <div className="flex items-center gap-2 xl:gap-3 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4 xl:h-5 xl:w-5" />
                                <span className="text-xs sm:text-sm xl:text-base font-medium">Dijawab</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 xl:gap-3 text-muted-foreground">
                                <AlertCircle className="h-4 w-4 xl:h-5 xl:w-5" />
                                <span className="text-xs sm:text-sm xl:text-base font-medium">Kosong (skor 0)</span>
                            </div>
                        )}
                        <div className="text-xs xl:text-sm text-muted-foreground">
                            {sectionIndex + 1}/{sectionTotal}
                        </div>
                    </div>

                    {isLast ? (
                        <Button 
                            onClick={onSubmit} 
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base text-white"
                        >
                            <Send className="h-4 w-4 xl:h-5 xl:w-5" />
                            <span className="hidden sm:inline">
                                {isSaving ? 'Menyimpan...' : 'Selesai'}
                            </span>
                            <span className="sm:hidden">
                                {isSaving ? 'Save...' : 'Done'}
                            </span>
                        </Button>
                    ) : (
                        <Button 
                            onClick={onNext} 
                            disabled={isSaving}
                            className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 text-sm xl:text-base"
                        >
                            <span className="hidden sm:inline">Selanjutnya</span>
                            <span className="sm:hidden">Next</span>
                            <ArrowRight className="h-4 w-4 xl:h-5 xl:w-5" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
})

// Add display name for ESLint
QuestionCard.displayName = 'QuestionCard'
