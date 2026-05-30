/**
 * CSV report generator for bulk import results.
 * Generates a downloadable CSV file with per-row import status.
 *
 * @module import-report
 * @see Requirements 6.3
 */

export interface ImportRowResult {
  email: string
  success: boolean
  message: string
}

export interface ImportReportData {
  results: ImportRowResult[]
}

/**
 * Escapes a CSV field value by wrapping in quotes if it contains
 * commas, quotes, or newlines. Double quotes are escaped as "".
 */
function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generates a CSV report string from bulk import results.
 *
 * Each row includes:
 * - email: the email address processed
 * - status: "berhasil" (success) or "gagal" (failed)
 * - keterangan: failure reason if failed, empty if successful
 *
 * @param data - The import result data containing per-row results
 * @returns CSV string with BOM for proper Excel encoding
 */
export function generateImportReportCsv(data: ImportReportData): string {
  const BOM = '\uFEFF'
  const header = 'email,status,keterangan'

  const rows = data.results.map((result) => {
    const email = escapeCsvField(result.email)
    const status = result.success ? 'berhasil' : 'gagal'
    const keterangan = result.success ? '' : escapeCsvField(result.message)

    return `${email},${status},${keterangan}`
  })

  return BOM + [header, ...rows].join('\n')
}

/**
 * Generates a CSV report as a Blob for download.
 *
 * @param data - The import result data containing per-row results
 * @returns Blob with CSV content and appropriate MIME type
 */
export function generateImportReportBlob(data: ImportReportData): Blob {
  const csv = generateImportReportCsv(data)
  return new Blob([csv], { type: 'text/csv;charset=utf-8' })
}

/**
 * Triggers a browser download of the import report CSV.
 *
 * @param data - The import result data containing per-row results
 * @param filename - Optional custom filename (defaults to timestamped name)
 */
export function downloadImportReport(data: ImportReportData, filename?: string): void {
  const blob = generateImportReportBlob(data)
  const url = URL.createObjectURL(blob)

  const defaultFilename = `laporan-import-${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? defaultFilename
  link.click()

  URL.revokeObjectURL(url)
}
