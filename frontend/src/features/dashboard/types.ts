import { DocumentType, OperationStatus, OperationDocument } from '../../types/common';

export interface DashboardFilterState {
  documentType: DocumentType | 'all';
  status: OperationStatus | 'all';
  warehouseId: string | 'all';
  category: string | 'all';
  search?: string;
}

export interface ActivityBreakdownItem {
  label: string;
  type: 'receipt' | 'delivery' | 'internal' | 'adjustment';
  count: number;
  percentage: number;
  color: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
  totalOperations: number;
  monthLabel: string;
  activityBreakdown: ActivityBreakdownItem[];
}

export interface DashboardOperationsResponse {
  success: boolean;
  count: number;
  total: number;
  data: OperationDocument[];
}
