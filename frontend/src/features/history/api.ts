import { api } from "../../lib/api";
import { MoveHistoryRecord } from "../../types/common";

export interface BackendHistoryItem {
  id: string;
  productId: string;
  productName: string | null;
  sku: string | null;
  uom: string | null;
  locationId: string;
  locationName: string | null;
  locationCode: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
  deltaQty: number;
  sourceType: "receipt" | "delivery" | "transfer" | "adjustment" | "initial_inventory";
  sourceId: string | null;
  balanceAfter: number;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface HistoryResponse {
  data: BackendHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface HistoryFilterParams {
  type?: string;
  productId?: string;
  locationId?: string;
  warehouseId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Transforms a backend ledger row into a UI MoveHistoryRecord format.
 */
export function mapBackendToMoveRecord(item: BackendHistoryItem): MoveHistoryRecord {
  const locDisplay = item.warehouseName
    ? `${item.warehouseName} / ${item.locationName || 'General'}`
    : item.locationName || 'Unknown Location';

  const refPrefix =
    item.sourceType === 'receipt'
      ? 'REC'
      : item.sourceType === 'delivery'
      ? 'DEL'
      : item.sourceType === 'transfer'
      ? 'INT'
      : item.sourceType === 'adjustment'
      ? 'ADJ'
      : 'INIT';

  const refSuffix = item.sourceId ? item.sourceId.slice(0, 8).toUpperCase() : item.id.slice(0, 8).toUpperCase();
  const referenceNumber = `${refPrefix}-${refSuffix}`;

  return {
    id: item.id,
    date: item.createdAt,
    referenceNumber,
    documentType: item.sourceType,
    productName: item.productName || 'Unknown Product',
    sku: item.sku || 'N/A',
    fromLocation: item.deltaQty < 0 ? locDisplay : '-',
    toLocation: item.deltaQty > 0 ? locDisplay : '-',
    quantityChange: item.deltaQty,
    balanceAfter: item.balanceAfter,
    unitOfMeasure: item.uom || 'units',
    user: item.createdByName || 'System / Staff',
    notes: item.notes || undefined,
  };
}

export const historyApi = {
  getHistory: async (params: HistoryFilterParams = {}): Promise<HistoryResponse> => {
    const query = new URLSearchParams();
    if (params.type && params.type !== 'all') query.append('type', params.type);
    if (params.productId) query.append('productId', params.productId);
    if (params.locationId) query.append('locationId', params.locationId);
    if (params.warehouseId) query.append('warehouseId', params.warehouseId);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/history${qs ? `?${qs}` : ''}`;
    return await api.get<HistoryResponse>(endpoint);
  },
};
