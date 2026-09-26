import React from 'react';
import { SearchInput } from '../../../components/ui/SearchInput';
import { ProductFilterState } from '../types';
import { PRODUCT_CATEGORIES } from '../../../lib/constants';

interface ProductFiltersProps {
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  categories?: string[];
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onChange,
  categories = PRODUCT_CATEGORIES,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={filters.search}
          onChangeValue={(val) => onChange({ ...filters, search: val })}
          placeholder="Search products by SKU, name, or category..."
        />
      </div>

      <div className="flex items-center gap-2">
        {/* Category Filter */}
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg shrink-0"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Stock Status Filter */}
        <select
          value={filters.stockStatus}
          onChange={(e) =>
            onChange({ ...filters, stockStatus: e.target.value as ProductFilterState['stockStatus'] })
          }
          className="select select-sm select-bordered bg-white border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg shrink-0"
        >
          <option value="all">All Stock Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>
    </div>
  );
};
