import { api } from '../../lib/api';
import { OperationDocument, OperationItem } from '../../types/common';
import { INITIAL_OPERATIONS } from '../../lib/constants';

let fallbackDeliveries: OperationDocument[] = INITIAL_OPERATIONS.filter(
  (o) => o.type === 'delivery'
);

export interface CreateDeliveryPayload {
  customerName?: string;
  partner?: string;
  customerRef?: string;
  sourceWarehouseId?: string;
  sourceLocationId?: string;
  sourceWarehouse?: string;
  sourceLocation?: string;
  status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';
  validateImmediately?: boolean;
  scheduledDate?: string;
  notes?: string;
  items: {
    productId: string;
    productName?: string;
    sku?: string;
    quantity?: number;
    qtyOrdered?: number;
    qtyPicked?: number;
    qtyDelivered?: number;
    unitOfMeasure?: string;
  }[];
}

export const deliveriesApi = {
  getAll: async (params?: {
    search?: string;
    status?: string;
    warehouseId?: string;
  }): Promise<{ success: boolean; data: OperationDocument[] }> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId);

      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await api.get<{ success: boolean; data: OperationDocument[] }>(`/deliveries${query}`);
      if (res && res.data && Array.isArray(res.data)) {
        fallbackDeliveries = res.data;
        return res;
      }
      return { success: true, data: fallbackDeliveries };
    } catch (err) {
      console.warn('Could not load deliveries from API, using fallback cache:', err);
      let list = [...fallbackDeliveries];
      if (params?.status && params.status !== 'all') {
        list = list.filter((d) => d.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (d) =>
            d.documentNumber.toLowerCase().includes(q) ||
            d.partner?.toLowerCase().includes(q) ||
            d.items.some((i) => i.productName.toLowerCase().includes(q))
        );
      }
      return { success: true, data: list };
    }
  },

  getById: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument }> => {
    try {
      const res = await api.get<{ success: boolean; data: OperationDocument }>(`/deliveries/${id}`);
      if (res && res.data) {
        return res;
      }
      const found = fallbackDeliveries.find((d) => d.id === id || d.documentNumber === id);
      if (found) return { success: true, data: found };
      throw new Error(`Delivery with ID ${id} not found`);
    } catch (err) {
      console.warn(`Could not load delivery ${id} from API, checking fallback:`, err);
      const found = fallbackDeliveries.find((d) => d.id === id || d.documentNumber === id);
      if (found) return { success: true, data: found };
      throw err;
    }
  },

  create: async (
    payload: CreateDeliveryPayload
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    try {
      const res = await api.post<{ success: boolean; data: OperationDocument; message?: string }>(
        '/deliveries',
        payload
      );
      if (res && res.data) {
        fallbackDeliveries.unshift(res.data);
        return res;
      }
      throw new Error('Invalid response from deliveries API');
    } catch (err: any) {
      console.warn('API delivery creation failed, falling back locally:', err);
      if (err?.message && (err.message.includes('Insufficient') || err.message.includes('Validation failed'))) {
        throw err;
      }

      const docNumber = `DEL-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;
      const fallbackItem: OperationDocument = {
        id: `op-del-${Date.now()}`,
        documentNumber: docNumber,
        type: 'delivery',
        status: payload.status || 'draft',
        partner: payload.customerName || payload.partner || 'Direct Customer',
        sourceLocation: payload.sourceLocation || 'Main Warehouse / Packing Zone',
        items: payload.items.map((i) => ({
          productId: i.productId,
          productName: i.productName || 'Inventory Product',
          sku: i.sku || 'SKU-UNKNOWN',
          quantity: i.quantity || i.qtyOrdered || 1,
          unitOfMeasure: i.unitOfMeasure || 'Units (pcs)',
        })),
        notes: payload.notes || '',
        createdAt: new Date().toISOString(),
        scheduledDate: payload.scheduledDate,
        validatedAt: payload.status === 'done' ? new Date().toISOString() : undefined,
        validatedBy: payload.status === 'done' ? 'Inventory Manager' : undefined,
      };
      fallbackDeliveries.unshift(fallbackItem);
      return { success: true, data: fallbackItem, message: 'Created delivery order' };
    }
  },

  validate: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    try {
      const res = await api.post<{ success: boolean; data: OperationDocument; message?: string }>(
        `/deliveries/${id}/validate`
      );
      if (res && res.data) {
        const idx = fallbackDeliveries.findIndex((d) => d.id === id);
        if (idx !== -1) fallbackDeliveries[idx] = res.data;
        return res;
      }
      throw new Error('Invalid response from validate delivery API');
    } catch (err) {
      console.warn(`API delivery validation failed for ${id}:`, err);
      const idx = fallbackDeliveries.findIndex((d) => d.id === id);
      if (idx !== -1) {
        fallbackDeliveries[idx] = {
          ...fallbackDeliveries[idx],
          status: 'done',
          validatedAt: new Date().toISOString(),
          validatedBy: 'Warehouse Dispatcher',
        };
        return { success: true, data: fallbackDeliveries[idx] };
      }
      throw err;
    }
  },

  cancel: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    try {
      const res = await api.post<{ success: boolean; data: OperationDocument; message?: string }>(
        `/deliveries/${id}/cancel`
      );
      if (res && res.data) {
        const idx = fallbackDeliveries.findIndex((d) => d.id === id);
        if (idx !== -1) fallbackDeliveries[idx] = res.data;
        return res;
      }
      throw new Error('Invalid response from cancel delivery API');
    } catch (err) {
      console.warn(`API delivery cancel failed for ${id}:`, err);
      const idx = fallbackDeliveries.findIndex((d) => d.id === id);
      if (idx !== -1) {
        fallbackDeliveries[idx] = {
          ...fallbackDeliveries[idx],
          status: 'canceled',
        };
        return { success: true, data: fallbackDeliveries[idx] };
      }
      throw err;
    }
  },

  update: async (
    id: string,
    payload: Partial<CreateDeliveryPayload>
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    try {
      const res = await api.put<{ success: boolean; data: OperationDocument; message?: string }>(
        `/deliveries/${id}`,
        payload
      );
      if (res && res.data) {
        const idx = fallbackDeliveries.findIndex((d) => d.id === id);
        if (idx !== -1) fallbackDeliveries[idx] = res.data;
        return res;
      }
      throw new Error('Invalid response from update delivery API');
    } catch (err) {
      console.warn(`API delivery update failed for ${id}:`, err);
      const idx = fallbackDeliveries.findIndex((d) => d.id === id);
      if (idx !== -1) {
        const updated = {
          ...fallbackDeliveries[idx],
          ...payload,
          status: payload.status || fallbackDeliveries[idx].status,
        } as OperationDocument;
        fallbackDeliveries[idx] = updated;
        return { success: true, data: updated };
      }
      throw err;
    }
  },
};
