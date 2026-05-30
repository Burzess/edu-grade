'use client'

import { Button } from '@/components/ui/button'

interface ClientPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ClientPagination({ page, totalPages, onPageChange }: ClientPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex justify-between items-center mt-4">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Halaman selanjutnya"
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  )
}
