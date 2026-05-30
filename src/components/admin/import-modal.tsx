'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ImportPreviewTable } from '@/components/admin/import-preview-table'
import { ImportProgress } from '@/components/admin/import-progress'
import { ImportResultSummary } from '@/components/admin/import-result-summary'
import { parseImportFile, type ParseResult } from '@/lib/file-parser'
import { generateExcelTemplate, generateCsvTemplate } from '@/lib/import-template'
import {
  bulkImportAction,
  type BulkImportRow,
  type BulkImportResult,
} from '@/app/admin/users/actions'

// ─── Types ───────────────────────────────────────────────────────────────────

type ImportStep = 'upload' | 'preview' | 'processing' | 'result'

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ACCEPTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
].join(',')

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportModal({ open, onOpenChange, onSuccess }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Handlers ────────────────────────────────────────────────────────────

  function resetState() {
    setStep('upload')
    setFileError(null)
    setIsParsing(false)
    setIsDragOver(false)
    setParseResult(null)
    setImportResult(null)
    setProgress({ current: 0, total: 0 })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (step === 'processing') return
    if (!nextOpen) {
      resetState()
    }
    onOpenChange(nextOpen)
  }

  function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filename.slice(lastDot).toLowerCase()
  }

  function validateFile(file: File): string | null {
    const extension = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV (.csv)'
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'Ukuran file melebihi batas maksimal 5MB'
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    setFileError(null)

    const validationError = validateFile(file)
    if (validationError) {
      setFileError(validationError)
      return
    }

    setIsParsing(true)
    try {
      const result = await parseImportFile(file)
      setParseResult(result)

      if (!result.success) {
        setFileError(result.errors[0] ?? 'Gagal memproses file')
        setIsParsing(false)
        return
      }

      setStep('preview')
    } catch {
      setFileError('Terjadi kesalahan saat memproses file. Silakan coba lagi.')
    } finally {
      setIsParsing(false)
    }
  }, [])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      void handleFile(file)
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      void handleFile(file)
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  async function handleDownloadExcelTemplate() {
    const blob = await generateExcelTemplate()
    downloadBlob(blob, 'template-import-akun.xlsx')
  }

  function handleDownloadCsvTemplate() {
    const blob = generateCsvTemplate()
    downloadBlob(blob, 'template-import-akun.csv')
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleCancel() {
    resetState()
    onOpenChange(false)
  }

  async function handleStartImport() {
    if (!parseResult) return

    const validRows = parseResult.rows.filter((row) => row.isValid)
    if (validRows.length === 0) return

    setStep('processing')
    setProgress({ current: 0, total: validRows.length })

    const batchSize = 5
    const allResults: BulkImportResult['results'] = []
    let totalSuccess = 0
    let totalFailed = 0

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize)
      const importRows: BulkImportRow[] = batch.map((row) => ({
        email: row.email,
        full_name: row.fullName,
        role: row.role.toLowerCase() as 'siswa' | 'guru',
        password: row.password || undefined,
      }))

      const batchResult = await bulkImportAction(importRows)

      allResults.push(...batchResult.results)
      totalSuccess += batchResult.successCount
      totalFailed += batchResult.failedCount

      setProgress({ current: Math.min(i + batchSize, validRows.length), total: validRows.length })
    }

    const finalResult: BulkImportResult = {
      totalProcessed: allResults.length,
      successCount: totalSuccess,
      failedCount: totalFailed,
      results: allResults,
    }

    setImportResult(finalResult)
    setStep('result')
  }

  function handleResultClose() {
    if (importResult && importResult.successCount > 0) {
      onSuccess()
    }
    resetState()
    onOpenChange(false)
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-3xl"
        showCloseButton={step !== 'processing'}
      >
        <DialogHeader>
          <DialogTitle>Import Akun</DialogTitle>
          <DialogDescription>
            Upload file Excel atau CSV untuk membuat akun secara massal.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <UploadStep
            fileError={fileError}
            isParsing={isParsing}
            isDragOver={isDragOver}
            fileInputRef={fileInputRef}
            onFileInputChange={handleFileInputChange}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onUploadClick={handleUploadClick}
            onDownloadExcel={handleDownloadExcelTemplate}
            onDownloadCsv={handleDownloadCsvTemplate}
          />
        )}

        {step === 'preview' && parseResult && (
          <PreviewStep
            parseResult={parseResult}
            onImport={handleStartImport}
            onCancel={handleCancel}
          />
        )}

        {step === 'processing' && (
          <ImportProgress processed={progress.current} total={progress.total} />
        )}

        {step === 'result' && importResult && (
          <ImportResultSummary result={importResult} onClose={handleResultClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Upload Step Sub-Component ───────────────────────────────────────────────

interface UploadStepProps {
  fileError: string | null
  isParsing: boolean
  isDragOver: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onUploadClick: () => void
  onDownloadExcel: () => void
  onDownloadCsv: () => void
}

function UploadStep({
  fileError,
  isParsing,
  isDragOver,
  fileInputRef,
  onFileInputChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
  onDownloadExcel,
  onDownloadCsv,
}: UploadStepProps) {
  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1.5">
        <p className="font-medium">Petunjuk Import:</p>
        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
          <li>Format file yang diterima: <strong>.xlsx</strong>, <strong>.xls</strong>, <strong>.csv</strong></li>
          <li>Kolom wajib: <strong>email</strong>, <strong>nama_lengkap</strong>, <strong>role</strong>, <strong>password</strong></li>
          <li>Password minimal <strong>8 karakter</strong>, maksimal <strong>72 karakter</strong></li>
          <li>Nilai role yang valid: <strong>siswa</strong> atau <strong>guru</strong></li>
          <li>Ukuran file maksimal: <strong>5MB</strong></li>
          <li>Jumlah baris data maksimal: <strong>500 baris</strong></li>
        </ul>
      </div>

      {/* Template download links */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDownloadExcel}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <Download className="size-3.5" />
          Unduh Template
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          onClick={onDownloadCsv}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <Download className="size-3.5" />
          Unduh Template CSV
        </button>
      </div>

      {/* File upload area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Area upload file. Klik atau seret file ke sini."
        onClick={onUploadClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onUploadClick()
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer
          ${isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          }
          ${isParsing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {isParsing ? (
          <>
            <FileSpreadsheet className="size-10 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Memproses file...</p>
          </>
        ) : (
          <>
            <Upload className="size-10 text-muted-foreground" />
            <p className="text-sm font-medium">
              Seret file ke sini atau klik untuk memilih
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx, .xls, atau .csv (maks. 5MB)
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES}
          onChange={onFileInputChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* Error message */}
      {fileError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}
    </div>
  )
}

// ─── Preview Step Sub-Component ──────────────────────────────────────────────

interface PreviewStepProps {
  parseResult: ParseResult
  onImport: () => void
  onCancel: () => void
}

function PreviewStep({ parseResult, onImport, onCancel }: PreviewStepProps) {
  const validCount = parseResult.validRows
  const allInvalid = validCount === 0

  return (
    <div className="space-y-4">
      <ImportPreviewTable
        rows={parseResult.rows}
        totalRows={parseResult.totalRows}
        validRows={parseResult.validRows}
        invalidRows={parseResult.invalidRows}
      />

      {allInvalid && (
        <p className="text-sm text-destructive font-medium">
          Tidak ada data valid untuk diimport
        </p>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button onClick={onImport} disabled={allInvalid}>
          Import {validCount} Akun Valid
        </Button>
      </div>
    </div>
  )
}
