"use client"

import React, { useState } from "react"
import { 
  Shield, 
  Clock, 
  FileText, 
  Users, 
  Check,
  ArrowRight,
  RotateCcw
} from "lucide-react"

interface ExamRulesDialogProps {
  open: boolean
  onConfirm: () => void
  ujian?: {
    name?: string
    duration_minutes?: number
    description?: string
    profiles?: { full_name?: string }
    allow_remidi?: boolean
    max_attempts?: number
  }
  totalQuestions?: number
  isRemidi?: boolean
  attemptNumber?: number
}

const rules = [
  "Dilarang membuka tab atau aplikasi lain selama ujian.",
  "Dilarang melakukan screenshot atau screen recording.",
  "Dilarang bekerja sama atau berdiskusi dengan orang lain.",
  "Dilarang menggunakan perangkat kedua (HP, tablet, dsb).",
  "Pastikan koneksi internet stabil selama ujian.",
]

const ExamRulesDialog: React.FC<ExamRulesDialogProps> = ({ 
  open, 
  onConfirm, 
  ujian,
  totalQuestions,
  isRemidi = false,
  attemptNumber
}) => {
  const [agreed, setAgreed] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/60 dark:bg-black/80" />

      {/* Dialog — full width bottom sheet on mobile, centered card on sm+ */}
      <div className="relative bg-white dark:bg-gray-900 shadow-lg w-full sm:max-w-md sm:mx-auto overflow-hidden border-t sm:border border-border animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-200 max-h-[95dvh] sm:max-h-[90vh] flex flex-col rounded-t-xl sm:rounded-lg">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 sm:p-2 rounded-md ${isRemidi ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
              {isRemidi ? <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" /> : <Shield className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground truncate">
                {isRemidi ? 'Remidi Ujian' : 'Peraturan Ujian'}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                {isRemidi 
                  ? `Percobaan ke-${attemptNumber || 2} — Nilai terbaik yang diambil`
                  : 'Baca dengan seksama sebelum memulai'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Exam Info */}
          {ujian && (
            <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2">
              <h3 className="font-medium text-xs sm:text-sm text-foreground truncate mb-1.5 sm:mb-2">
                {ujian.name || "Ujian"}
              </h3>
              <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-muted-foreground">
                {ujian.duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{ujian.duration_minutes} menit</span>
                  </div>
                )}
                {totalQuestions !== undefined && totalQuestions > 0 && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{totalQuestions} soal</span>
                  </div>
                )}
                {ujian.profiles?.full_name && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{ujian.profiles.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="px-4 sm:px-5 py-2.5 sm:py-3">
            <h4 className="font-medium text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-2">
              Larangan Selama Ujian
            </h4>
            <ol className="space-y-1 sm:space-y-1.5">
              {rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 sm:gap-2.5 text-xs sm:text-sm text-foreground leading-relaxed">
                  <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted text-muted-foreground text-[10px] sm:text-xs flex items-center justify-center font-medium mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Timer Notice */}
          <div className="px-4 sm:px-5 pb-2.5 sm:pb-3">
            <p className="text-[11px] sm:text-xs text-muted-foreground bg-muted/50 rounded-md p-2 sm:p-2.5 border border-border/50">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1 sm:mr-1.5 -mt-0.5" />
              Waktu ujian dimulai setelah Anda menekan tombol &quot;{isRemidi ? 'Mulai Remidi' : 'Mulai Ujian'}&quot;.
            </p>
          </div>
        </div>

        {/* Agreement + Button */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-4 pt-2.5 sm:pt-3 space-y-2.5 sm:space-y-3 border-t border-border flex-shrink-0">
          <label className="flex items-start gap-2 sm:gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary/30 cursor-pointer"
            />
            <span className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
              Saya telah membaca dan memahami peraturan ujian serta bersedia menerima konsekuensi jika melanggar.
            </span>
          </label>

          <button
            disabled={!agreed}
            onClick={onConfirm}
            className={`
              w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium text-sm transition-colors
              ${agreed
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            <span>{isRemidi ? 'Mulai Remidi' : 'Mulai Ujian'}</span>
            {agreed && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExamRulesDialog
