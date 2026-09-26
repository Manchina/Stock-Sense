import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2 } from 'lucide-react';
import { Product } from '../../../types/common';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StockStatus } from '../../../components/inventory/StockStatus';
import { formatCurrency } from '../../../lib/utils';

interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  onDelete?: (product: Product) => void;
  pageSize?: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  filtersComponent?: React.ReactNode;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  onDelete,
  pageSize = 10,
  searchValue,
  onSearchChange,
  filtersComponent,
}) => {
  const navigate = useNavigate();

  const columns: Column<Product>[] = [
    {
      header: 'Product / SKU',
      accessorKey: 'name',
      sortable: true,
      cell: (p) => (
        <div>
          <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">
            {p.name}
          </div>
          <div className="font-mono text-[11px] text-slate-500 uppercase font-semibold">{p.sku}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
      sortable: true,
      cell: (p) => (
        <span className="badge badge-sm bg-slate-100 text-slate-800 border-slate-300 font-semibold text-[11px]">
          {p.category}
        </span>
      ),
    },
    {
      header: 'UoM',
      accessorKey: 'unitOfMeasure',
      cell: (p) => <span className="text-xs text-slate-600 font-semibold">{p.unitOfMeasure}</span>,
    },
    {
      header: 'Stock Level',
      accessorKey: 'currentStock',
      sortable: true,
      cell: (p) => (
        <StockStatus
          currentStock={p.currentStock}
          minStockAlert={p.minStockAlert}
          unitOfMeasure={p.unitOfMeasure}
        />
      ),
    },
    {
      header: 'Selling Price',
      accessorKey: 'sellingPrice',
      sortable: true,
      className: 'text-right',
      cell: (p) => (
        <span className="font-bold text-xs text-slate-900">
          {p.sellingPrice != null ? formatCurrency(p.sellingPrice) : '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/products/${p.id}/edit`)}
            className="btn btn-ghost btn-xs text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg p-1.5"
            title="Edit Product"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(p)}
              className="btn btn-ghost btn-xs text-slate-500 hover:text-error hover:bg-rose-50 rounded-lg p-1.5"
              title="Delete Product"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      keyExtractor={(p) => p.id}
      isLoading={isLoading}
      pageSize={pageSize}
      showSearch={Boolean(onSearchChange)}
      searchValue={searchValue}
      searchPlaceholder="Search products by SKU, name, or category..."
      onSearchChange={onSearchChange}
      filters={filtersComponent}
      emptyTitle="No products found"
      emptyDescription="Create your first inventory product or adjust your search filters."
      onRowClick={(p) => navigate(`/products/${p.id}`)}
      paginationPosition="top"
    />
  );
};
