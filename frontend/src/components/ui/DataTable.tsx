import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { PaginationBar, DEFAULT_PAGE_SIZE_OPTIONS } from './PaginationBar';
import { SearchInput } from './SearchInput';
import { cn } from '../../lib/utils';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;

  // Single-line integrated toolbar (Search & Filters)
  toolbar?: React.ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  filters?: React.ReactNode;

  // Controlled or uncontrolled pagination
  pageSize?: number;
  pageSizeOptions?: number[];
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowClick?: (item: T) => void;
  showPagination?: boolean;
  paginationPosition?: 'top' | 'bottom' | 'both';
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyTitle = 'No records found',
  emptyDescription = 'There are currently no items matching your criteria.',
  emptyAction,
  toolbar,
  showSearch,
  searchValue,
  searchPlaceholder = 'Search...',
  onSearchChange,
  filters,
  pageSize: controlledPageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  currentPage: controlledCurrentPage,
  totalPages: controlledTotalPages,
  totalItems: controlledTotalItems,
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
  onRowClick,
  showPagination = true,
  paginationPosition = 'top',
  className,
}: DataTableProps<T>) {
  // Internal state for uncontrolled pagination
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(controlledPageSize || 10);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset page when dataset changes
  useEffect(() => {
    if (!controlledCurrentPage) {
      setInternalPage(1);
    }
  }, [data.length, controlledCurrentPage]);

  const pageSize = controlledPageSize ?? internalPageSize;
  const currentPage = controlledCurrentPage ?? internalPage;

  // Handle client-side sorting if applied
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortField, sortDirection]);

  const totalItems = controlledTotalItems ?? sortedData.length;
  const totalPages =
    controlledTotalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(totalPages, newPage));
    if (controlledOnPageChange) {
      controlledOnPageChange(validPage);
    } else {
      setInternalPage(validPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (controlledOnPageSizeChange) {
      controlledOnPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortField === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(key);
      setSortDirection('asc');
    }
  };

  // Slice data for display if uncontrolled
  const displayData = useMemo(() => {
    if (controlledTotalPages !== undefined) {
      return sortedData;
    }
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, controlledTotalPages]);

  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  const hasControls = Boolean(showSearch || filters || toolbar);

  const renderTopControlsBar = () => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-3.5 bg-white border-b border-slate-200">
        {/* Left Side: Search & Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 flex-grow">
          {showSearch && onSearchChange && (
            <div className="w-full sm:w-64 lg:w-72">
              <SearchInput
                value={searchValue ?? ''}
                onChangeValue={onSearchChange}
                placeholder={searchPlaceholder}
              />
            </div>
          )}
          {filters}
          {toolbar}
        </div>

        {/* Right Side: Record Count, Pagination & Rows Selector in ONE LINE */}
        {showPagination && (
          <div className="flex items-center gap-2.5 flex-shrink-0 ml-auto">
            <div className="text-xs text-slate-500 font-medium hidden md:block">
              Showing <span className="font-bold text-slate-900">{startRecord}</span> to{' '}
              <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> records
            </div>

            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </div>
    );
  };

  const renderBottomPaginationBar = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs font-medium text-slate-600">
      <div className="text-xs text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-900">{startRecord}</span> to{' '}
        <span className="font-bold text-slate-900">{endRecord}</span> of{' '}
        <span className="font-bold text-slate-900">{totalItems}</span> records
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );

  return (
    <div className={cn("bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xs space-y-0", className)}>
      {/* Top Single-Line Controls Toolbar */}
      {(hasControls || (showPagination && (paginationPosition === 'top' || paginationPosition === 'both'))) &&
        renderTopControlsBar()}

      {isLoading ? (
        <div className="w-full min-h-[260px] flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-md text-primary"></span>
            <span className="text-xs font-semibold text-slate-600">Loading data...</span>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="p-8">
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full text-left">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    onClick={() => col.sortable && handleSort(col.accessorKey)}
                    className={cn(
                      'py-3 px-4 text-slate-700 select-none',
                      col.sortable && 'cursor-pointer hover:text-slate-900 transition-colors',
                      col.className
                    )}
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {sortField === col.accessorKey ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    'hover:bg-slate-50/80 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn('py-3 px-4 text-xs font-medium text-slate-800', col.className)}>
                      {col.cell
                        ? col.cell(item)
                        : col.accessorKey
                        ? String(item[col.accessorKey] ?? '-')
                        : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Pagination Bar */}
      {showPagination && data.length > 0 && (paginationPosition === 'bottom' || paginationPosition === 'both') &&
        renderBottomPaginationBar()}
    </div>
  );
}
