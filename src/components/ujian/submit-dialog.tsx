"use client"

import { memo } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react'

interface SubmitDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    sectionProgress: {
        multipleChoice: {
            answered: number
            total: number
        }
        essay: {
            answered: number
            total: number
        }
    }
    totalAnswered: number
    totalQuestions: number
    isSubmitting: boolean
    ujian?: any
}

export const SubmitDialog = memo(({
    isOpen,
    onOpenChange,
    onConfirm,
    sectionProgress,
    totalAnswered,
    totalQuestions,
    isSubmitting,
    ujian
}: SubmitDialogProps) => {
    const unansweredCount = totalQuestions - totalAnswered

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-sm sm:max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-base">Kumpulkan Ujian</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm">
                        Apakah Anda yakin ingin mengumpulkan ujian?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-2.5 text-sm">
                    {/* Progress */}
                    <div className="border border-border rounded-md p-3 space-y-1">
                        <div className="font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            Progress Jawaban
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                            <span>Pilihan Ganda</span>
                            <span className="font-medium text-foreground">{sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total}</span>
                        </div>
                        <div className="text-muted-foreground flex justify-between">
                            <span>Essay</span>
                            <span className="font-medium text-foreground">{sectionProgress.essay.answered}/{sectionProgress.essay.total}</span>
                        </div>
                        <div className="border-t border-border pt-1 mt-1 flex justify-between font-medium text-foreground">
                            <span>Total</span>
                            <span>{totalAnswered}/{totalQuestions} soal</span>
                        </div>
                    </div>
                    
                    {unansweredCount > 0 && (
                        <p className="text-amber-600 dark:text-amber-400 text-xs flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                            <span>{unansweredCount} soal belum dijawab akan mendapat skor 0.</span>
                        </p>
                    )}
                    
                    <p className="text-destructive text-xs flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>Setelah dikumpulkan, jawaban tidak bisa diubah lagi.</span>
                    </p>
                </div>
                
                <AlertDialogFooter>
                    <AlertDialogCancel className="text-sm" disabled={isSubmitting}>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isSubmitting}
                        className="text-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Mengumpulkan...
                            </>
                        ) : 'Ya, Kumpulkan'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
})

SubmitDialog.displayName = 'SubmitDialog'
