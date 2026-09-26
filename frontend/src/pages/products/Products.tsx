import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ProductFilters } from '../../features/products/components/ProductFilters';
import { ProductTable } from '../../features/products/components/ProductTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { productsApi } from '../../features/products/api';
import { ProductFilterState } from '../../features/products/types';
import { Product } from '../../types/common';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState<ProductFilterState>({
    search: '',
    category: 'all',
    stockStatus: 'all',
  });

  const loadProducts = async () => {
    try {
      setErrorMessage(null);
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
    productsApi.getCategories().then((cats) => {
      if (cats && cats.length > 0) setCategories(cats);
    });
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts();
  };

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
      if (filters.category !== 'all' && p.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
      // Stock Status
      if (filters.stockStatus === 'in_stock' && p.currentStock <= p.minStockAlert) return false;
      if (filters.stockStatus === 'low_stock' && (p.currentStock > p.minStockAlert || p.currentStock <= 0)) return false;
      if (filters.stockStatus === 'out_of_stock' && p.currentStock > 0) return false;

      return true;
    });
  }, [products, filters]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await productsApi.delete(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Inventory Catalog"
        subtitle="Manage product master data, SKU codes, categories, units of measure, and stock availability."
      >
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="btn btn-outline border-slate-300 btn-sm rounded-xl font-bold bg-white text-slate-700 shadow-xs hover:bg-slate-50 flex items-center"
          title="Refresh products list"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={() => navigate('/products/new')}
          className="btn btn-primary btn-sm rounded-xl text-white font-bold shadow-xs flex items-center"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Product
        </button>
      </PageHeader>

      {errorMessage && (
        <div className="alert alert-warning text-xs font-semibold rounded-xl">
          <span>{errorMessage}</span>
        </div>
      )}

      <ProductFilters filters={filters} onChange={setFilters} categories={categories} />

      <ProductTable
        products={filteredProducts}
        isLoading={isLoading}
        onDelete={(prod) => setDeleteTarget(prod)}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.sku})? This will deactivate the item and preserve stock ledger integrity.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
