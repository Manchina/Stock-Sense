import { api } from '../../lib/api';
import { OperationDocument, OperationItem } from '../../types/common';

export interface CreateReceiptPayload {
  supplierName?: string;
  partner?: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;
  destinationLocation?: string;
  status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';
  validateImmediately?: boolean;
  expectedDate?: string;
  scheduledDate?: string;
  notes?: string;
  items: {
    productId: string;
    productName?: string;
    sku?: string;
    quantity?: number;
    qtyExpected?: number;
    qtyReceived?: number;
    unitOfMeasure?: string;
  }[];
}

export const receiptsApi = {
  getReceipts: async (params?: {
    search?: string;
    status?: string;
    warehouseId?: string;
  }): Promise<{ success: boolean; data: OperationDocument[] }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.warehouseId) searchParams.set('warehouseId', params.warehouseId);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return api.get<{ success: boolean; data: OperationDocument[] }>(`/receipts${query}`);
  },

  getReceiptById: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument }> => {
    return api.get<{ success: boolean; data: OperationDocument }>(`/receipts/${id}`);
  },

  createReceipt: async (
    payload: CreateReceiptPayload
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    return api.post<{ success: boolean; data: OperationDocument; message?: string }>(
      '/receipts',
      payload
    );
  },

  validateReceipt: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    return api.post<{ success: boolean; data: OperationDocument; message?: string }>(
      `/receipts/${id}/validate`
    );
  },

  cancelReceipt: async (
    id: string
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    return api.post<{ success: boolean; data: OperationDocument; message?: string }>(
      `/receipts/${id}/cancel`
    );
  },

  updateReceipt: async (
    id: string,
    payload: Partial<CreateReceiptPayload>
  ): Promise<{ success: boolean; data: OperationDocument; message?: string }> => {
    return api.put<{ success: boolean; data: OperationDocument; message?: string }>(
      `/receipts/${id}`,
      payload
    );
  },
};
