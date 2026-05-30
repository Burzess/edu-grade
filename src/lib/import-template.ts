/**
 * Import template generator for bulk account creation.
 * Generates Excel (.xlsx) and CSV templates with header and example rows.
 *
 * Requirements: 7.3, 7.4
 */

const TEMPLATE_HEADERS = ['email', 'nama_lengkap', 'role', 'password'] as const

const TEMPLATE_ROWS = [
  ['siswa@sekolah.id', 'Nama Siswa', 'siswa', 'password123'],
  ['guru@sekolah.id', 'Nama Guru', 'guru', 'password456'],
]

/**
 * Generates an Excel (.xlsx) template file for bulk account import.
 * Includes header row and two example rows demonstrating required format.
 */
export async function generateExcelTemplate(): Promise<Blob> {
  const XLSX = await import('xlsx')

  const data = [TEMPLATE_HEADERS as unknown as string[], ...TEMPLATE_ROWS]
  const worksheet = XLSX.utils.aoa_to_sheet(data)

  worksheet['!cols'] = [
    { wch: 25 }, // email
    { wch: 20 }, // nama_lengkap
    { wch: 10 }, // role
    { wch: 15 }, // password
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Import')

  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Generates a CSV template file for bulk account import.
 * Includes header row and two example rows demonstrating required format.
 */
export function generateCsvTemplate(): Blob {
  const lines = [
    TEMPLATE_HEADERS.join(','),
    TEMPLATE_ROWS.map((row) => row.join(',')).join('\n'),
  ]

  const csvContent = lines.join('\n')
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
}
