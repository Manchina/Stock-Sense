import { Product } from '../../types/common';
import { INITIAL_PRODUCTS } from '../../lib/constants';
import { ProductFormData } from './types';
import { api } from '../../lib/api';

// In-memory fallback cache for offline development or network disconnection
let fallbackProducts: Product[] = [...INITIAL_PRODUCTS];

export const productsApi = {
  getAll: async (params?: { search?: string; category?: string; status?: string }): Promise<Product[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
      if (params?.status && params.status !== 'all') searchParams.set('status', params.status);

      const qs = searchParams.toString();
      const endpoint = qs ? `/products?${qs}` : '/products';
      const res = await api.get<{ success: boolean; data: Product[] }>(endpoint);

      if (res && res.data && Array.isArray(res.data)) {
        fallbackProducts = res.data;
        return res.data;
      }
      return fallbackProducts;
    } catch (err) {
      console.warn('Could not load products from API, falling back to local cache:', err);
      return [...fallbackProducts];
    }
  },

  getById: async (id: string): Promise<Product | undefined> => {
    try {
      const res = await api.get<{ success: boolean; data: Product }>(`/products/${id}`);
      if (res && res.data) {
        return res.data;
      }
      return fallbackProducts.find((p) => p.id === id);
    } catch (err) {
      console.warn(`Could not load product ${id} from API, checking local fallback:`, err);
      return fallbackProducts.find((p) => p.id === id);
    }
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const payload = {
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      category: data.category,
      unitOfMeasure: data.unitOfMeasure,
      initialStock: Number(data.currentStock) || 0,
      minStockAlert: Number(data.minStockAlert) || 0,
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      description: data.description?.trim() || undefined,
      initialLocation: data.initialLocation || undefined,
    };

    try {
      const res = await api.post<{ success: boolean; data: Product }>('/products', payload);
      if (res && res.data) {
        fallbackProducts.unshift(res.data);
        return res.data;
      }
      throw new Error('Invalid response received from products API');
    } catch (err: any) {
      console.warn('API creation failed, falling back locally:', err);
      // If server failed due to validation or conflict, rethrow so UI displays it
      if (err?.message && (err.message.includes('already exists') || err.message.includes('Validation failed'))) {
        throw err;
      }

      // Offline fallback creation
      const fallbackItem: Product = {
        id: `prod-${Date.now()}`,
        name: payload.name,
        sku: payload.sku,
        category: payload.category,
        unitOfMeasure: payload.unitOfMeasure,
        currentStock: payload.initialStock,
        minStockAlert: payload.minStockAlert,
        costPrice: payload.costPrice,
        sellingPrice: payload.sellingPrice,
        description: payload.description,
        locationStock: payload.initialLocation ? { [payload.initialLocation]: payload.initialStock } : {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fallbackProducts.unshift(fallbackItem);
      return fallbackItem;
    }
  },

  update: async (id: string, data: Partial<ProductFormData>): Promise<Product> => {
    const payload = {
      name: data.name?.trim(),
      sku: data.sku?.trim().toUpperCase(),
      category: data.category,
      unitOfMeasure: data.unitOfMeasure,
      minStockAlert: data.minStockAlert !== undefined ? Number(data.minStockAlert) : undefined,
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      description: data.description?.trim(),
    };

    try {
      const res = await api.put<{ success: boolean; data: Product }>(`/products/${id}`, payload);
      if (res && res.data) {
        const idx = fallbackProducts.findIndex((p) => p.id === id);
        if (idx !== -1) fallbackProducts[idx] = res.data;
        return res.data;
      }
      throw new Error('Invalid response received from products API');
    } catch (err: any) {
      console.warn(`API update failed for product ${id}:`, err);
      if (err?.message && err.message.includes('already taken')) {
        throw err;
      }
      const idx = fallbackProducts.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Product not found in local cache');

      const updated = {
        ...fallbackProducts[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      } as Product;
      fallbackProducts[idx] = updated;
      return updated;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/products/${id}`);
      fallbackProducts = fallbackProducts.filter((p) => p.id !== id);
    } catch (err) {
      console.warn(`API deletion failed for product ${id}, removing from local cache:`, err);
      fallbackProducts = fallbackProducts.filter((p) => p.id !== id);
    }
  },

  getCategories: async (): Promise<string[]> => {
    try {
      const res = await api.get<{ success: boolean; data: Array<{ name: string }> }>('/categories');
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((c) => c.name);
      }
    } catch (err) {
      console.warn('Could not load categories from API:', err);
    }
    return [
      'Raw Materials',
      'Finished Goods',
      'Components & Fasteners',
      'Packaging',
      'Tools & Equipment',
      'Electronics',
    ];
  },

  getWarehouseLocations: async (): Promise<string[]> => {
    try {
      const res = await api.get<{
        success: boolean;
        data: Array<{ code: string; name: string; locations: string[] }>;
      }>('/warehouses');

      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const result: string[] = [];
        for (const wh of res.data) {
          for (const loc of wh.locations || []) {
            result.push(`${wh.code || wh.name} / ${loc}`);
          }
        }
        if (result.length > 0) return result;
      }
    } catch (err) {
      console.warn('Could not load warehouse locations from API:', err);
    }
    return [
      'WH-MAIN / Rack A',
      'WH-MAIN / Rack B',
      'WH-MAIN / Packing Zone',
      'WH-PROD / Raw Stock Buffer',
      'WH-DIST / Aisle 1',
    ];
  },
};
