"use client"

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface SectionTabsProps {
    questionSections: {
        multipleChoice: any[]
        essay: any[]
    }
    currentSectionType: 'multiple_choice' | 'essay'
    sectionProgress: {
        multipleChoice: {
            answered: number
            total: number
            percentage: number
        }
        essay: {
            answered: number
            total: number
            percentage: number
        }
    }
    onSectionSwitch: (sectionType: 'multiple_choice' | 'essay') => void
}

export const SectionTabs = memo(({
    questionSections,
    currentSectionType,
    sectionProgress,
    onSectionSwitch
}: SectionTabsProps) => {
    const handleSectionSwitch = (targetSectionType: 'multiple_choice' | 'essay') => {
        // Jangan lakukan apa-apa jika sudah di section yang sama
        if (currentSectionType === targetSectionType) return
        
        onSectionSwitch(targetSectionType)
        
        // Berikan feedback toast
        const sectionName = targetSectionType === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'
        toast.success(`Beralih ke section ${sectionName}`, {
            duration: 1500
        })
    }

    return (
        <div className="bg-white border-b">
            <div className="container mx-auto px-3 sm:px-4 xl:px-8">
                <div className="flex gap-2 sm:gap-4 xl:gap-12 overflow-x-auto scrollbar-hide">
                    {questionSections.multipleChoice.length > 0 && (
                        <button
                            onClick={() => handleSectionSwitch('multiple_choice')}
                            className={`
                                flex-shrink-0 py-3 xl:py-4 px-3 xl:px-4 border-b-3 xl:border-b-4 transition-all duration-300 hover:scale-105
                                ${currentSectionType === 'multiple_choice' 
                                    ? 'border-blue-600 text-blue-600 bg-blue-50 shadow-sm' 
                                    : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-25'
                                }
                            `}
                        >
                            <div className="flex flex-col sm:flex-row items-center gap-1 xl:gap-3">
                                <div className="flex items-center gap-2 xl:gap-3">
                                    <span className="text-sm xl:text-lg font-medium">📝</span>
                                    <span className="text-sm xl:text-lg font-semibold">PILIHAN GANDA</span>
                                    <Badge 
                                        variant={currentSectionType === 'multiple_choice' ? 'default' : 'secondary'}
                                        className="text-xs xl:text-sm px-2 py-1 xl:px-3 xl:py-1"
                                    >
                                        {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total}
                                    </Badge>
                                </div>
                                {currentSectionType !== 'multiple_choice' && (
                                    <span className="text-xs text-gray-400 hidden sm:inline xl:text-sm">↗ Klik untuk beralih</span>
                                )}
                            </div>
                            <div className="w-20 xl:w-32 bg-gray-200 rounded-full h-1 xl:h-2 mt-2">
                                <div 
                                    className="bg-blue-600 h-1 xl:h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${sectionProgress.multipleChoice.percentage}%` }}
                                />
                            </div>
                        </button>
                    )}

                    {questionSections.essay.length > 0 && (
                        <button
                            onClick={() => handleSectionSwitch('essay')}
                            className={`
                                flex-shrink-0 py-3 xl:py-4 px-3 xl:px-4 border-b-3 xl:border-b-4 transition-all duration-300 hover:scale-105
                                ${currentSectionType === 'essay' 
                                    ? 'border-green-600 text-green-600 bg-green-50 shadow-sm' 
                                    : 'border-transparent text-gray-500 hover:text-green-600 hover:border-green-300 hover:bg-green-25'
                                }
                            `}
                        >
                            <div className="flex flex-col sm:flex-row items-center gap-1 xl:gap-3">
                                <div className="flex items-center gap-2 xl:gap-3">
                                    <span className="text-sm xl:text-lg font-medium">✍️</span>
                                    <span className="text-sm xl:text-lg font-semibold">ESSAY</span>
                                    <Badge 
                                        variant={currentSectionType === 'essay' ? 'default' : 'secondary'}
                                        className="text-xs xl:text-sm px-2 py-1 xl:px-3 xl:py-1 bg-green-100 text-green-800"
                                    >
                                        {sectionProgress.essay.answered}/{sectionProgress.essay.total}
                                    </Badge>
                                </div>
                                {currentSectionType !== 'essay' && (
                                    <span className="text-xs text-gray-400 hidden sm:inline xl:text-sm">↗ Klik untuk beralih</span>
                                )}
                            </div>
                            <div className="w-20 xl:w-32 bg-gray-200 rounded-full h-1 xl:h-2 mt-2">
                                <div 
                                    className="bg-green-600 h-1 xl:h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${sectionProgress.essay.percentage}%` }}
                                />
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})

SectionTabs.displayName = 'SectionTabs'
