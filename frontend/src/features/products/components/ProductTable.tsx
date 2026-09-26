import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../../types/common';
import { DataTable, Column } from '../../../components/ui/DataTable';
import { StockStatus } from '../../../components/inventory/StockStatus';
import { formatCurrency } from '../../../lib/utils';

interface ProductTableProps {
  products: Product[];
  isLoading?: boolean;
  onDelete?: (product: Product) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const navigate = useNavigate();

  const columns: Column<Product>[] = [
    {
      header: 'Product / SKU',
      cell: (p) => (
        <div>
          <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">
            {p.name}
          </div>
          <div className="font-mono text-xs text-slate-500 uppercase font-semibold">{p.sku}</div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (p) => (
        <span className="badge badge-sm bg-slate-100 text-slate-800 border-slate-300 font-semibold">
          {p.category}
        </span>
      ),
    },
    {
      header: 'UoM',
      accessorKey: 'unitOfMeasure',
      cell: (p) => <span className="text-xs text-slate-600 font-medium">{p.unitOfMeasure}</span>,
    },
    {
      header: 'Stock Level',
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
      className: 'text-right',
      cell: (p) => (
        <span className="font-bold text-xs text-slate-900">
          {p.sellingPrice ? formatCurrency(p.sellingPrice) : '-'}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={products}
      keyExtractor={(p) => p.id}
      isLoading={isLoading}
      emptyTitle="No products found"
      emptyDescription="Create your first inventory product or adjust your search filters."
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      onRowClick={(p) => navigate(`/products/${p.id}`)}
    />
  );
};
