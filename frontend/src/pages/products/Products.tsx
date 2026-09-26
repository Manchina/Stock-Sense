import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProductFilters } from '../../features/products/components/ProductFilters';
import { ProductTable } from '../../features/products/components/ProductTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { productsApi } from '../../features/products/api';
import { ProductFilterState } from '../../features/products/types';
import { Product } from '../../types/common';
import { usePagination } from '../../hooks/usePagination';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [filters, setFilters] = useState<ProductFilterState>({
    search: '',
    category: 'all',
    stockStatus: 'all',
  });

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSku = p.sku.toLowerCase().includes(query);
        const matchCat = p.category.toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchCat) return false;
      }
      // Category
      if (filters.category !== 'all' && p.category !== filters.category) {
        return false;
      }
      // Stock Status
      if (filters.stockStatus === 'in_stock' && p.currentStock <= p.minStockAlert) return false;
      if (filters.stockStatus === 'low_stock' && (p.currentStock > p.minStockAlert || p.currentStock <= 0)) return false;
      if (filters.stockStatus === 'out_of_stock' && p.currentStock > 0) return false;

      return true;
    });
  }, [products, filters]);

  const { paginatedItems, currentPage, totalPages, goToPage } = usePagination({
    items: filteredProducts,
    pageSize: 8,
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await productsApi.delete(deleteTarget.id);
    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Inventory Catalog"
        subtitle="Manage product master data, SKU codes, categories, units of measure, and stock availability."
      >
        <button
          onClick={() => navigate('/products/new')}
          className="btn btn-primary btn-sm sm:btn-md rounded-xl text-white font-bold shadow-xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Product
        </button>
      </PageHeader>

      <ProductFilters filters={filters} onChange={setFilters} />

      <ProductTable
        products={paginatedItems}
        isLoading={isLoading}
        onDelete={(prod) => setDeleteTarget(prod)}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.sku})? This will remove all associated stock ledger references.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
