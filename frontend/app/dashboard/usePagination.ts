import { useState, useMemo, useCallback, useEffect } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
}

export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
  offset: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePagination(options: UsePaginationOptions = {}): PaginationMetadata {
  const { initialPage = 1, initialPageSize = 50, total: totalFromOptions = 0 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(totalFromOptions);
  
  // Sync total from options when it changes
  useEffect(() => {
    setTotal(totalFromOptions);
  }, [totalFromOptions]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const offset = useMemo(() => (currentPage - 1) * pageSize, [currentPage, pageSize]);
  const hasNextPage = useMemo(() => currentPage < totalPages, [currentPage, totalPages]);
  const hasPreviousPage = useMemo(() => currentPage > 1, [currentPage]);

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    // Recalculate which page we should be on with new page size
    const newTotalPages = Math.max(1, Math.ceil(total / size));
    const newPage = Math.min(currentPage, newTotalPages);
    setCurrentPage(newPage > 0 ? newPage : 1);
  }, [currentPage, total]);

  return {
    currentPage,
    pageSize,
    total,
    totalPages,
    offset,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: handleSetPageSize
  };
}
