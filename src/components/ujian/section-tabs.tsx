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
        <div className="bg-card/80 border-b border-border/60">
            <div className="container mx-auto px-3 sm:px-4 xl:px-6">
                <div className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1.5">
                    {questionSections.multipleChoice.length > 0 && (
                        <button
                            onClick={() => handleSectionSwitch('multiple_choice')}
                            className={`
                                flex-shrink-0 py-2 px-3 sm:px-4 rounded-lg transition-all duration-200
                                ${currentSectionType === 'multiple_choice' 
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800' 
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                }
                            `}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Pilihan Ganda</span>
                                <Badge 
                                    variant={currentSectionType === 'multiple_choice' ? 'default' : 'secondary'}
                                    className="text-[10px] px-1.5 py-0 h-4"
                                >
                                    {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total}
                                </Badge>
                                </div>
                            {/* Progress bar inline */}
                            <div className="w-16 bg-muted rounded-full h-1 mt-1.5">
                                <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-500" 
                                    style={{ width: `${sectionProgress.multipleChoice.percentage}%` }}
                                />
                            </div>
                        </button>
                    )}

                    {questionSections.essay.length > 0 && (
                        <button
                            onClick={() => handleSectionSwitch('essay')}
                            className={`
                                flex-shrink-0 py-2 px-3 sm:px-4 rounded-lg transition-all duration-200
                                ${currentSectionType === 'essay' 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200 dark:border-emerald-800' 
                                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                }
                            `}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Essay</span>
                                <Badge 
                                    variant={currentSectionType === 'essay' ? 'default' : 'secondary'}
                                    className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                                >
                                    {sectionProgress.essay.answered}/{sectionProgress.essay.total}
                                </Badge>
                                </div>
                            <div className="w-16 bg-muted rounded-full h-1 mt-1.5">
                                <div 
                                    className="bg-emerald-500 h-1 rounded-full transition-all duration-500" 
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
