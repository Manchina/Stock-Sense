import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';
import { DashboardFilterState } from '../types';
import { INITIAL_WAREHOUSES, PRODUCT_CATEGORIES } from '../../../lib/constants';

interface WarehouseOption {
  id?: string;
  code: string;
  name: string;
}

interface CategoryOption {
  id?: string;
  name: string;
}

interface OperationFiltersProps {
  filters: DashboardFilterState;
  onChange: (filters: DashboardFilterState) => void;
  onReset: () => void;
  warehouses?: WarehouseOption[];
  categories?: CategoryOption[];
}

export const OperationFilters: React.FC<OperationFiltersProps> = ({
  filters,
  onChange,
  onReset,
  warehouses = INITIAL_WAREHOUSES,
  categories = PRODUCT_CATEGORIES.map((c, idx) => ({ id: `cat-${idx}`, name: c })),
}) => {
  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Operations & Stock Filters</span>
        </div>
        <button
          onClick={onReset}
          className="btn btn-ghost btn-xs gap-1 text-slate-500 hover:text-rose-600 font-bold"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Quick search operations by ref #, partner, item name, or notes..."
          className="input input-sm input-bordered w-full pl-9 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary text-xs font-medium rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Document Type */}
        <div className="form-control">
          <label className="label py-0.5 mb-0.5">
            <span className="label-text text-xs font-bold text-slate-700">
              Document Type
            </span>
          </label>
          <select
            value={filters.documentType}
            onChange={(e) =>
              onChange({ ...filters, documentType: e.target.value as DashboardFilterState['documentType'] })
            }
            className="select select-sm select-bordered w-full bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-medium"
          >
            <option value="all">All Document Types</option>
            <option value="receipt">Receipts (Incoming)</option>
            <option value="delivery">Deliveries (Outgoing)</option>
            <option value="internal">Internal Transfers</option>
            <option value="adjustment">Adjustments</option>
          </select>
        </div>

        {/* Status */}
        <div className="form-control">
          <label className="label py-0.5 mb-0.5">
            <span className="label-text text-xs font-bold text-slate-700">
              Status
            </span>
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onChange({ ...filters, status: e.target.value as DashboardFilterState['status'] })
            }
            className="select select-sm select-bordered w-full bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="waiting">Waiting</option>
            <option value="ready">Ready</option>
            <option value="done">Done</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>

        {/* Warehouse */}
        <div className="form-control">
          <label className="label py-0.5 mb-0.5">
            <span className="label-text text-xs font-bold text-slate-700">
              Warehouse
            </span>
          </label>
          <select
            value={filters.warehouseId}
            onChange={(e) =>
              onChange({ ...filters, warehouseId: e.target.value })
            }
            className="select select-sm select-bordered w-full bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-medium"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id || w.code} value={w.code}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="form-control">
          <label className="label py-0.5 mb-0.5">
            <span className="label-text text-xs font-bold text-slate-700">
              Product Category
            </span>
          </label>
          <select
            value={filters.category}
            onChange={(e) =>
              onChange({ ...filters, category: e.target.value })
            }
            className="select select-sm select-bordered w-full bg-white border border-slate-300 text-slate-900 rounded-lg text-xs font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id || cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
