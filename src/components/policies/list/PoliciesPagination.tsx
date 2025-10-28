'use client';

import { Button } from '@/components/ui/button';

interface PoliciesPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination controls for policies list
 */
export default function PoliciesPagination({
  currentPage,
  totalPages,
  onPageChange,
}: PoliciesPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex justify-center gap-2 mt-6">
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        Anterior
      </Button>
      <span className="flex items-center px-4">
        Página {currentPage} de {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        Siguiente
      </Button>
    </div>
  );
}
