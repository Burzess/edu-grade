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
            {/* Mobile Toggle Button - Hidden on desktop */}
            <Button
                variant="outline"
                size="sm"
                onClick={onToggle}
                className="fixed top-16 sm:top-20 right-2 sm:right-4 z-20 xl:hidden shadow-lg p-2"
            >
                <Grid3X3 className="h-4 w-4" />
            </Button>

            {/* Enhanced Navigator Panel for desktop */}
            <div className={`
                fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-30 transition-transform duration-300
                w-72 sm:w-80 xl:w-full
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                xl:translate-x-0 xl:relative xl:shadow-none xl:z-10 xl:bg-gray-50/50 xl:border-gray-300
            `}>
                <div className="p-3 sm:p-4 xl:p-6 border-b border-gray-200 xl:border-gray-300 xl:bg-white">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base xl:text-lg">
                            {sectionType === 'multiple_choice' ? '📝 PILIHAN GANDA' : '✍️ ESSAY'}
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onToggle}
                            className="xl:hidden p-1"
                        >
                            ✕
                        </Button>
                    </div>
                    <div className="text-xs xl:text-sm text-gray-500 mt-1">
                        {questions.length} soal tersedia
                    </div>
                </div>

                <div className="p-3 sm:p-4 xl:p-6 h-full overflow-y-auto pb-20 xl:pb-6">
                    <div className="grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-6 gap-2 xl:gap-3">
                        {questions.map((question, index) => {
                            const isAnswered = answers[question.soal?.id]?.trim()
                            const isCurrent = index === currentIndex
                            
                            return (
                                <button
                                    key={index}
                                    onClick={() => {
                                        onQuestionSelect(index)
                                        onToggle() // Close on mobile
                                    }}
                                    className={`
                                        w-10 h-10 sm:w-12 sm:h-12 xl:w-14 xl:h-14 rounded-md xl:rounded-lg border-2 text-sm xl:text-base font-semibold transition-all duration-200 relative hover:scale-105
                                        ${isCurrent 
                                            ? 'border-blue-500 bg-blue-500 text-white shadow-lg scale-105 ring-2 ring-blue-300 ring-offset-2' 
                                            : isAnswered
                                                ? 'border-green-500 bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm'
                                        }
                                    `}
                                >
                                    {index + 1}
                                    {isAnswered && !isCurrent && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 xl:w-4 xl:h-4 bg-green-500 rounded-full border-2 border-white"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Enhanced Legend for desktop */}
                    <div className="mt-4 xl:mt-6 pt-4 xl:pt-6 border-t border-gray-200 xl:border-gray-300">
                        <div className="text-xs xl:text-sm text-gray-600 space-y-2 xl:space-y-3">
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-blue-500 rounded xl:rounded-md border-2 border-blue-500 ring-2 ring-blue-300 ring-offset-1"></div>
                                <span className="xl:font-medium">Soal saat ini</span>
                            </div>
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-green-100 rounded xl:rounded-md border-2 border-green-500 relative">
                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 xl:w-3 xl:h-3 bg-green-500 rounded-full border border-white"></div>
                                </div>
                                <span className="xl:font-medium">Sudah dijawab</span>
                            </div>
                            <div className="flex items-center gap-2 xl:gap-3">
                                <div className="w-4 h-4 xl:w-5 xl:h-5 bg-white rounded xl:rounded-md border-2 border-gray-300"></div>
                                <span className="xl:font-medium">Kosong (skor 0)</span>
                            </div>
                        </div>
                        <div className="mt-3 xl:mt-4 p-2 xl:p-3 bg-yellow-50 rounded xl:rounded-lg text-xs xl:text-sm text-yellow-700">
                            💡 <span className="xl:font-medium">Soal yang tidak dijawab akan otomatis mendapat skor 0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    )
})

// Add display name for ESLint
QuestionNavigator.displayName = 'QuestionNavigator'
