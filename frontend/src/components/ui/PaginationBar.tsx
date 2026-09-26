import React from 'react';
import { Rows3 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './pagination';
import { cn } from '../../lib/utils';

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
  showRowsSelector?: boolean;
}

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 6) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const result: (number | string)[] = [];
  result.push(1);
  if (current > 3) {
    result.push('...');
  }
  if (current > 2) {
    result.push(current - 1);
  }
  if (current !== 1 && current !== total) {
    result.push(current);
  }
  if (current < total - 1) {
    result.push(current + 1);
  }
  if (current < total - 2) {
    result.push('...');
  }
  if (total > 1) {
    result.push(total);
  }
  return result;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className,
  showRowsSelector = true,
}) => {
  const pageNumbers = getPageNumbers(currentPage, Math.max(1, totalPages));

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Pagination control matching PeopleFirst */}
      <Pagination>
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious
              onClick={() => {
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              disabled={currentPage <= 1}
              aria-disabled={currentPage <= 1}
            />
          </PaginationItem>

          {pageNumbers.map((p, idx) =>
            p === '...' ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={`page-${p}-${idx}`}>
                <PaginationLink
                  isActive={p === currentPage}
                  onClick={() => {
                    if (typeof p === 'number' && p !== currentPage) onPageChange(p);
                  }}
                  className="h-8 w-8 rounded-full p-0"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              onClick={() => {
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              disabled={currentPage >= totalPages}
              aria-disabled={currentPage >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Page Size Selector matching PeopleFirst */}
      {showRowsSelector && (
        <div className="flex items-center ml-1">
          <div className="flex items-center gap-1.5 h-8 bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 text-xs font-semibold text-slate-800 shadow-2xs transition-colors">
            <Rows3 className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (parsed > 0) onPageSizeChange(parsed);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
              aria-label="Select page size"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                  {typeof totalItems === 'number' && totalItems > 0 ? `/${totalItems}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
