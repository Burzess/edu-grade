import * as XLSX from 'xlsx'

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawRow {
  email?: string
  nama_lengkap?: string
  role?: string
  password?: string
}

export interface ParsedRow {
  rowNumber: number
  email: string
  fullName: string
  role: string
  password?: string
  isValid: boolean
  errors: string[]
}

export interface ParseResult {
  success: boolean
  rows: ParsedRow[]
  totalRows: number
  validRows: number
  invalidRows: number
  errors: string[] // file-level errors
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_ROW_COUNT = 500

const REQUIRED_HEADERS = ['email', 'nama_lengkap', 'role', 'password'] as const
const ALL_HEADERS = ['email', 'nama_lengkap', 'role', 'password'] as const

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse an import file (Excel or CSV) and validate its contents.
 * Performs file-level validation (extension, size) then row-level validation.
 */
export async function parseImportFile(file: File): Promise<ParseResult> {
  // File extension validation
  const extension = getFileExtension(file.name)
  if (!isValidExtension(extension)) {
    return createErrorResult(
      'Format file tidak didukung. Gunakan file Excel (.xlsx, .xls) atau CSV (.csv)'
    )
  }

  // File size validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return createErrorResult('Ukuran file melebihi batas maksimal 5MB')
  }

  // Read file content
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) {
    return createErrorResult('File tidak memiliki data untuk diimport')
  }

  // Parse sheet to JSON with raw headers
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: '',
  })

  // Get headers from the sheet
  const headerRow = getHeaders(firstSheet)
  const headerMap = mapHeaders(headerRow)

  // Validate required headers exist
  const missingHeaders = findMissingHeaders(headerMap)
  if (missingHeaders.length > 0) {
    return createErrorResult(
      `Kolom berikut tidak ditemukan: ${missingHeaders.join(', ')}`
    )
  }

  // Row count validation
  if (rawData.length > MAX_ROW_COUNT) {
    return createErrorResult(
      'Jumlah data melebihi batas maksimal 500 baris per import'
    )
  }

  // Empty data validation
  if (rawData.length === 0) {
    return createErrorResult('File tidak memiliki data untuk diimport')
  }

  // Parse and validate each row
  const rows: ParsedRow[] = rawData.map((rawRow, index) => {
    const normalizedRow = normalizeRow(rawRow, headerMap)
    return validateRow(normalizedRow, index + 2) // +2 because row 1 is header, data starts at row 2
  })

  const validRows = rows.filter((r) => r.isValid).length
  const invalidRows = rows.filter((r) => !r.isValid).length

  return {
    success: true,
    rows,
    totalRows: rows.length,
    validRows,
    invalidRows,
    errors: [],
  }
}

/**
 * Validate a single row of import data.
 * Checks email format, non-empty nama_lengkap, and valid role.
 */
export function validateRow(row: RawRow, rowNumber: number): ParsedRow {
  const errors: string[] = []

  const email = (row.email ?? '').trim()
  const fullName = (row.nama_lengkap ?? '').trim()
  const role = (row.role ?? '').trim()
  const password = (row.password ?? '').trim() || undefined

  // Check empty required fields
  const emptyFields: string[] = []
  if (!email) emptyFields.push('email')
  if (!fullName) emptyFields.push('nama_lengkap')
  if (!role) emptyFields.push('role')
  if (!password) emptyFields.push('password')

  if (emptyFields.length > 0) {
    errors.push(`Kolom ${emptyFields.join(', ')} tidak boleh kosong`)
  }

  // Validate email format (only if not empty)
  if (email && !isValidEmail(email)) {
    errors.push('Format email tidak valid')
  }

  // Validate role (only if not empty)
  if (role && !isValidRole(role)) {
    errors.push("Role harus 'siswa' atau 'guru'")
  }

  // Validate password length (only if not empty)
  if (password && password.length < 8) {
    errors.push('Password minimal 8 karakter')
  }
  if (password && password.length > 72) {
    errors.push('Password maksimal 72 karakter')
  }

  return {
    rowNumber,
    email,
    fullName,
    role: role.toLowerCase(),
    password,
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Generate a random default password with exactly 12 characters.
 * Guaranteed to contain at least one uppercase letter, one lowercase letter, and one digit.
 */
export function generateDefaultPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const allChars = uppercase + lowercase + digits

  // Ensure at least one of each required type
  const result: string[] = []
  result.push(randomChar(uppercase))
  result.push(randomChar(lowercase))
  result.push(randomChar(digits))

  // Fill remaining 9 characters
  for (let i = 3; i < 12; i++) {
    result.push(randomChar(allChars))
  }

  // Shuffle to avoid predictable positions
  return shuffleArray(result).join('')
}

// ─── Exported Helpers (for testing) ──────────────────────────────────────────

/**
 * Check if a file extension is valid for import.
 */
export function isValidExtension(extension: string): boolean {
  return ALLOWED_EXTENSIONS.includes(extension.toLowerCase())
}

/**
 * Extract file extension from filename (including the dot).
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

/**
 * Validate email format:
 * - Contains exactly one "@"
 * - Local part (before @) has at least 1 character
 * - Domain (after @) contains at least one dot with domain length >= 2 chars
 */
export function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf('@')
  const lastAtIndex = email.lastIndexOf('@')

  // Must contain exactly one "@"
  if (atIndex === -1 || atIndex !== lastAtIndex) return false

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  // Local part must have at least 1 character
  if (localPart.length < 1) return false

  // Domain must contain at least one dot
  const dotIndex = domain.indexOf('.')
  if (dotIndex === -1) return false

  // Domain must be at least 2 characters
  if (domain.length < 2) return false

  return true
}

/**
 * Validate role value (case-insensitive).
 */
export function isValidRole(role: string): boolean {
  const normalized = role.toLowerCase().trim()
  return normalized === 'siswa' || normalized === 'guru'
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function createErrorResult(error: string): ParseResult {
  return {
    success: false,
    rows: [],
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    errors: [error],
  }
}

/**
 * Get headers from the first row of a worksheet.
 */
function getHeaders(sheet: XLSX.WorkSheet): string[] {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1')
  const headers: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const value = cell ? String(cell.v ?? '') : ''
    headers.push(value)
  }

  return headers
}

/**
 * Create a mapping from normalized header names to original header names.
 * Handles case-insensitive matching with whitespace trimming.
 */
function mapHeaders(headers: string[]): Map<string, string> {
  const map = new Map<string, string>()

  for (const header of headers) {
    const normalized = header.trim().toLowerCase()
    for (const knownHeader of ALL_HEADERS) {
      if (normalized === knownHeader) {
        map.set(knownHeader, header)
        break
      }
    }
  }

  return map
}

/**
 * Find which required headers are missing from the header map.
 */
function findMissingHeaders(headerMap: Map<string, string>): string[] {
  const missing: string[] = []
  for (const required of REQUIRED_HEADERS) {
    if (!headerMap.has(required)) {
      missing.push(required)
    }
  }
  return missing
}

/**
 * Normalize a raw row object using the header map.
 * Maps original header names to standard field names.
 */
function normalizeRow(
  rawRow: Record<string, unknown>,
  headerMap: Map<string, string>
): RawRow {
  const result: RawRow = {}

  for (const [standardName, originalHeader] of headerMap.entries()) {
    const value = rawRow[originalHeader]
    const stringValue = value != null ? String(value) : ''

    if (standardName === 'email') result.email = stringValue
    else if (standardName === 'nama_lengkap') result.nama_lengkap = stringValue
    else if (standardName === 'role') result.role = stringValue
    else if (standardName === 'password') result.password = stringValue
  }

  return result
}

function randomChar(chars: string): string {
  const index = Math.floor(Math.random() * chars.length)
  return chars[index]
}

function shuffleArray(arr: string[]): string[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
