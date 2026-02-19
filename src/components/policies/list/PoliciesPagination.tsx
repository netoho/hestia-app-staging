'use client';

import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

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
    <nav aria-label="Paginación" className="flex justify-center gap-2 mt-6">
      <Button
        variant="outline"
        aria-label="Página anterior"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        {t.pages.createPolicy.list.pagination.previous}
      </Button>
      <span className="flex items-center px-4" aria-current="page">
        {t.pages.createPolicy.list.pagination.page(currentPage, totalPages)}
      </span>
      <Button
        variant="outline"
        aria-label="Página siguiente"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        {t.pages.createPolicy.list.pagination.next}
      </Button>
    </nav>
  );
}
