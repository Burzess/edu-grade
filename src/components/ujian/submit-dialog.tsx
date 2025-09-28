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
    ujian?: any // NEW: Added ujian parameter for redirect info
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
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Kumpulkan Ujian</AlertDialogTitle>
                    <AlertDialogDescription>
                        Apakah Anda yakin ingin mengumpulkan ujian?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                {/* Progress dan informasi dikumpulkan ke dalam body content terpisah */}
                <div className="space-y-3">
                    <div className="bg-primary/10 p-3 rounded-lg text-sm">
                        <div className="font-medium mb-2">📊 Progress Anda:</div>
                        <div className="space-y-1">
                            <div>📝 Pilihan Ganda: {sectionProgress.multipleChoice.answered}/{sectionProgress.multipleChoice.total} soal</div>
                            <div>✍️ Essay: {sectionProgress.essay.answered}/{sectionProgress.essay.total} soal</div>
                            <div className="font-medium">Total: {totalAnswered}/{totalQuestions} soal dijawab</div>
                        </div>
                    </div>
                    
                    {unansweredCount > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg text-sm">
                            <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Perhatian:</div>
                            <div className="text-yellow-700 dark:text-yellow-300">
                                {unansweredCount} soal yang tidak dijawab akan otomatis mendapat skor 0.
                            </div>
                        </div>
                    )}
                    
                    <div className="text-destructive text-sm">
                        ⚠️ Setelah dikumpulkan, Anda tidak bisa mengubah jawaban lagi.
                    </div>
                    
                    {ujian?.kelas_id && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
                            <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">ℹ️ Setelah submit:</div>
                            <div className="text-blue-700 dark:text-blue-300">
                                Anda akan diarahkan kembali ke halaman kelas untuk melihat hasil ujian.
                            </div>
                        </div>
                    )}
                </div>
                
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
})

SubmitDialog.displayName = 'SubmitDialog'
