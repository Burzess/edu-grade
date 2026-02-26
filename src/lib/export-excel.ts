import * as XLSX from 'xlsx'

interface SiswaResult {
  siswa: {
    full_name: string
  }
  averageScore: number | null
}

export function exportHasilUjianToExcel(
  ujianName: string,
  siswaResults: SiswaResult[]
) {
  const rows = siswaResults.map((result, index) => ({
    'No': index + 1,
    'Nama Siswa': result.siswa.full_name,
    'Nilai': result.averageScore ?? '-',
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)

  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 5 },   // No
    { wch: 30 },  // Nama Siswa
    { wch: 10 },  // Nilai
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Ujian')

  const sanitizedName = ujianName.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const date = new Date().toISOString().slice(0, 10)
  const fileName = `Hasil_${sanitizedName}_${date}.xlsx`

  XLSX.writeFile(workbook, fileName)
}
