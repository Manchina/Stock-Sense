export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export type DocumentType = 'receipt' | 'delivery' | 'internal' | 'transfer' | 'adjustment' | 'initial_inventory';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'inventory_manager' | 'warehouse_staff' | 'admin';
  avatar?: string;
  warehouseId?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  locations: string[]; // e.g. ["Rack A", "Rack B", "Main Store", "Production Floor"]
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitOfMeasure: string;
  currentStock: number;
  minStockAlert: number;
  costPrice?: number;
  sellingPrice?: number;
  locationStock?: Record<string, number>; // e.g. { "Main Warehouse / Rack A": 45 }
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface OperationDocument {
  id: string;
  documentNumber: string;
  orderNumber?: string;
  type: DocumentType;
  status: OperationStatus;
  partner?: string; // Vendor for receipts, Customer for deliveries
  customerName?: string;
  customerRef?: string;
  supplierName?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  sourceWarehouseId?: string;
  sourceLocationId?: string;
  destinationWarehouseId?: string;
  destinationLocationId?: string;
  items: OperationItem[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  scheduledDate?: string;
  validatedAt?: string;
  validatedBy?: string;
  createdBy?: string;
}

export interface MoveHistoryRecord {
  id: string;
  date: string;
  referenceNumber: string;
  documentType: DocumentType;
  productName: string;
  sku: string;
  fromLocation?: string;
  toLocation?: string;
  quantityChange: number; // e.g. +50 or -20
  balanceAfter?: number;
  unitOfMeasure: string;
  user: string;
  notes?: string;
}

export interface DashboardKPIs {
  totalProducts: number;
  lowStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
}
