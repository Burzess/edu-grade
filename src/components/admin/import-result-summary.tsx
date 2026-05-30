'use client'

import { CheckCircle2, XCircle, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadImportReport } from '@/lib/import-report'
import type { BulkImportResult } from '@/app/admin/users/actions'

interface ImportResultSummaryProps {
  result: BulkImportResult
  onClose: () => void
}

export function ImportResultSummary({ result, onClose }: ImportResultSummaryProps) {
  const { totalProcessed, successCount, failedCount, results } = result
  const failedRows = results.filter((r) => !r.success)
  const hasSuccess = successCount > 0

  function handleDownloadReport() {
    downloadImportReport({ results })
  }

  function handleClose() {
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Summary counts */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="size-4" />
          Ringkasan Hasil Import
        </h3>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-md bg-muted p-3">
            <p className="text-2xl font-bold text-foreground">{totalProcessed}</p>
            <p className="text-xs text-muted-foreground">Total Diproses</p>
          </div>
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/30">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {successCount}
            </p>
            <p className="text-xs text-muted-foreground">Berhasil</p>
          </div>
          <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/30">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {failedCount}
            </p>
            <p className="text-xs text-muted-foreground">Gagal</p>
          </div>
        </div>
      </div>

      {/* Success message */}
      {hasSuccess && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-300">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successCount} akun berhasil dibuat.</span>
        </div>
      )}

      {/* Failed rows list */}
      {failedRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <XCircle className="size-4 shrink-0" />
            <span>{failedCount} akun gagal dibuat:</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Alasan</th>
                </tr>
              </thead>
              <tbody>
                {failedRows.map((row, index) => (
                  <tr
                    key={`${row.email}-${index}`}
                    className="border-t bg-red-50/50 dark:bg-red-950/10"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="outline" onClick={handleDownloadReport}>
          <Download className="size-4" />
          Unduh Laporan
        </Button>
        <Button onClick={handleClose}>Tutup</Button>
      </div>
    </div>
  )
}
