import { DocumentType, OperationStatus } from '../../types/common';

export interface DashboardFilterState {
  documentType: DocumentType | 'all';
  status: OperationStatus | 'all';
  warehouseId: string | 'all';
  category: string | 'all';
}
