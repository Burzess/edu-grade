'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ParsedRow } from '@/lib/file-parser'

const MAX_PREVIEW_ROWS = 50

interface ImportPreviewTableProps {
  rows: ParsedRow[]
  totalRows: number
  validRows: number
  invalidRows: number
}

export function ImportPreviewTable({
  rows,
  totalRows,
  validRows,
  invalidRows,
}: ImportPreviewTableProps) {
  const displayedRows = rows.slice(0, MAX_PREVIEW_ROWS)
  const hasMoreRows = totalRows > MAX_PREVIEW_ROWS

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="font-medium">
          Total: <span className="text-foreground">{totalRows} baris</span>
        </span>
        <span className="font-medium text-green-600">
          <CheckCircle2 className="mr-1 inline-block h-4 w-4" />
          Valid: {validRows} baris
        </span>
        <span className="font-medium text-red-600">
          <AlertTriangle className="mr-1 inline-block h-4 w-4" />
          Invalid: {invalidRows} baris
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">No</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.map((row) => (
              <TableRow
                key={row.rowNumber}
                className={cn(!row.isValid && 'bg-red-50 dark:bg-red-950/20')}
              >
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell className="max-w-48 truncate">{row.email}</TableCell>
                <TableCell className="max-w-48 truncate">
                  {row.fullName}
                </TableCell>
                <TableCell className="capitalize">{row.role}</TableCell>
                <TableCell>
                  {row.isValid ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      Invalid
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-64 text-sm text-muted-foreground">
                  {row.errors.length > 0 ? row.errors.join('; ') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* More rows indicator */}
      {hasMoreRows && (
        <p className="text-center text-sm text-muted-foreground">
          Menampilkan {MAX_PREVIEW_ROWS} dari {totalRows} baris.{' '}
          {totalRows - MAX_PREVIEW_ROWS} baris lainnya tidak ditampilkan.
        </p>
      )}
    </div>
  )
}
