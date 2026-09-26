import { api } from '../../lib/api';
import {
  DashboardStats,
  DashboardFilterState,
  DashboardOperationsResponse,
} from './types';
import { OperationDocument, Warehouse } from '../../types/common';
import {
  INITIAL_PRODUCTS,
  INITIAL_OPERATIONS,
  INITIAL_WAREHOUSES,
  PRODUCT_CATEGORIES,
} from '../../lib/constants';

function computeFallbackStats(): DashboardStats {
  const totalProducts = INITIAL_PRODUCTS.length;
  const lowStockCount = INITIAL_PRODUCTS.filter(
    (p) => p.currentStock <= p.minStockAlert
  ).length;

  const pendingReceipts = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'receipt' && o.status !== 'done' && o.status !== 'canceled'
  ).length;

  const pendingDeliveries = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'delivery' && o.status !== 'done' && o.status !== 'canceled'
  ).length;

  const scheduledTransfers = INITIAL_OPERATIONS.filter(
    (o) => o.type === 'internal' && o.status !== 'done' && o.status !== 'canceled'
  ).length;

  const receiptCount = INITIAL_OPERATIONS.filter((o) => o.type === 'receipt').length;
  const deliveryCount = INITIAL_OPERATIONS.filter((o) => o.type === 'delivery').length;
  const transferCount = INITIAL_OPERATIONS.filter((o) => o.type === 'internal').length;
  const adjustmentCount = INITIAL_OPERATIONS.filter((o) => o.type === 'adjustment').length;

  const totalOps = receiptCount + deliveryCount + transferCount + adjustmentCount;
  const rPct = totalOps > 0 ? Math.round((receiptCount / totalOps) * 100) : 0;
  const dPct = totalOps > 0 ? Math.round((deliveryCount / totalOps) * 100) : 0;
  const tPct = totalOps > 0 ? Math.round((transferCount / totalOps) * 100) : 0;
  const aPct = totalOps > 0 ? Math.max(0, 100 - (rPct + dPct + tPct)) : 0;

  return {
    totalProducts,
    lowStockCount,
    pendingReceipts,
    pendingDeliveries,
    scheduledTransfers,
    totalOperations: totalOps,
    monthLabel: 'September 2026',
    activityBreakdown: [
      { label: 'Receipts (In)', type: 'receipt', count: receiptCount, percentage: rPct, color: 'bg-emerald-600' },
      { label: 'Deliveries (Out)', type: 'delivery', count: deliveryCount, percentage: dPct, color: 'bg-blue-600' },
      { label: 'Transfers', type: 'internal', count: transferCount, percentage: tPct, color: 'bg-teal-600' },
      { label: 'Adjustments', type: 'adjustment', count: adjustmentCount, percentage: aPct, color: 'bg-amber-600' },
    ],
  };
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const res = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
      if (res && res.success && res.data) {
        return res.data;
      }
      return computeFallbackStats();
    } catch (err) {
      console.warn('Could not fetch dashboard stats from API, using fallback calculations:', err);
      return computeFallbackStats();
    }
  },

  getOperations: async (filters?: DashboardFilterState, limit: number = 4): Promise<OperationDocument[]> => {
    try {
      const params = new URLSearchParams();
      if (filters?.documentType && filters.documentType !== 'all') {
        params.set('documentType', filters.documentType);
      }
      if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters?.warehouseId && filters.warehouseId !== 'all') {
        params.set('warehouseId', filters.warehouseId);
      }
      if (filters?.category && filters.category !== 'all') {
        params.set('category', filters.category);
      }
      if (filters?.search?.trim()) {
        params.set('search', filters.search.trim());
      }
      params.set('limit', String(limit));

      const qs = params.toString();
      const endpoint = qs ? `/dashboard/operations?${qs}` : '/dashboard/operations';
      const res = await api.get<DashboardOperationsResponse>(endpoint);

      if (res && res.success && Array.isArray(res.data)) {
        return res.data.slice(0, limit);
      }
      return INITIAL_OPERATIONS.slice(0, limit);
    } catch (err) {
      console.warn('Could not fetch dashboard operations from API, filtering fallback operations:', err);
      const filtered = INITIAL_OPERATIONS.filter((op) => {
        if (filters?.documentType && filters.documentType !== 'all' && op.type !== filters.documentType) {
          return false;
        }
        if (filters?.status && filters.status !== 'all' && op.status !== filters.status) {
          return false;
        }
        if (filters?.warehouseId && filters.warehouseId !== 'all') {
          const matchSrc = op.sourceLocation?.includes(filters.warehouseId);
          const matchDst = op.destinationLocation?.includes(filters.warehouseId);
          if (!matchSrc && !matchDst) return false;
        }
        return true;
      });
      return filtered.slice(0, limit);
    }
  },

  getWarehouses: async (): Promise<Warehouse[]> => {
    try {
      const res = await api.get<{ success: boolean; data: Warehouse[] }>('/warehouses');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      return INITIAL_WAREHOUSES;
    } catch (err) {
      console.warn('Could not fetch warehouses for dashboard filters, using fallback:', err);
      return INITIAL_WAREHOUSES;
    }
  },

  getCategories: async (): Promise<Array<{ id: string; name: string }>> => {
    try {
      const res = await api.get<{ success: boolean; data: Array<{ id: string; name: string }> }>('/categories');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      return PRODUCT_CATEGORIES.map((c, idx) => ({ id: `cat-${idx}`, name: c }));
    } catch (err) {
      console.warn('Could not fetch categories for dashboard filters, using fallback:', err);
      return PRODUCT_CATEGORIES.map((c, idx) => ({ id: `cat-${idx}`, name: c }));
    }
  },
};
