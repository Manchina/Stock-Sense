import { OperationStatus, DocumentType, Product, Warehouse, OperationDocument, MoveHistoryRecord } from '../types/common';

export const OPERATION_STATUS_CONFIG: Record<
  OperationStatus,
  { label: string; badgeClass: string; color: string }
> = {
  draft: { label: 'Draft', badgeClass: 'badge-ghost', color: 'text-slate-500' },
  waiting: { label: 'Waiting', badgeClass: 'badge-warning', color: 'text-amber-500' },
  ready: { label: 'Ready', badgeClass: 'badge-info', color: 'text-blue-500' },
  done: { label: 'Done', badgeClass: 'badge-success', color: 'text-emerald-500' },
  canceled: { label: 'Canceled', badgeClass: 'badge-error', color: 'text-rose-500' },
};

export const DOCUMENT_TYPE_CONFIG: Record<
  DocumentType,
  { label: string; prefix: string; color: string }
> = {
  receipt: { label: 'Receipt (Incoming)', prefix: 'REC', color: 'text-emerald-600' },
  delivery: { label: 'Delivery Order (Outgoing)', prefix: 'DEL', color: 'text-blue-600' },
  internal: { label: 'Internal Transfer', prefix: 'INT', color: 'text-teal-600' },
  transfer: { label: 'Internal Transfer', prefix: 'INT', color: 'text-teal-600' },
  adjustment: { label: 'Inventory Adjustment', prefix: 'ADJ', color: 'text-amber-600' },
  initial_inventory: { label: 'Initial Inventory', prefix: 'INIT', color: 'text-purple-600' },
};

export const PRODUCT_CATEGORIES = [
  'Raw Materials',
  'Finished Goods',
  'Components & Fasteners',
  'Packaging',
  'Tools & Equipment',
  'Electronics',
];

export const UNITS_OF_MEASURE = [
  'Units (pcs)',
  'Kilograms (kg)',
  'Meters (m)',
  'Liters (L)',
  'Boxes (box)',
  'Pallets (plt)',
];

export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-1',
    name: 'Main Central Warehouse',
    code: 'WH-MAIN',
    address: '100 Logistics Blvd, Industrial Zone',
    locations: ['Receiving Bay', 'Rack A', 'Rack B', 'Rack C', 'Packing Zone'],
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'wh-2',
    name: 'Production Facility Store',
    code: 'WH-PROD',
    address: '45 Assembly Rd, Unit 2',
    locations: ['Production Floor', 'Raw Stock Buffer', 'Finished Goods Staging'],
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'wh-3',
    name: 'Regional Distribution Center',
    code: 'WH-DIST',
    address: '88 Express Highway, North Port',
    locations: ['Aisle 1', 'Aisle 2', 'Dispatch Bay'],
    createdAt: '2026-02-01T11:00:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Steel Rods (12mm)',
    sku: 'RAW-STL-12MM',
    category: 'Raw Materials',
    unitOfMeasure: 'Kilograms (kg)',
    currentStock: 450,
    minStockAlert: 100,
    costPrice: 4.5,
    sellingPrice: 7.2,
    locationStock: {
      'WH-MAIN / Rack A': 300,
      'WH-PROD / Raw Stock Buffer': 150,
    },
    description: 'High tensile carbon steel construction rods.',
    createdAt: '2026-01-20T10:00:00Z',
    updatedAt: '2026-09-20T14:30:00Z',
  },
  {
    id: 'prod-2',
    name: 'Ergonomic Office Chair',
    sku: 'FGD-CHR-ERG',
    category: 'Finished Goods',
    unitOfMeasure: 'Units (pcs)',
    currentStock: 24,
    minStockAlert: 30, // low stock!
    costPrice: 85.0,
    sellingPrice: 199.99,
    locationStock: {
      'WH-MAIN / Packing Zone': 14,
      'WH-DIST / Aisle 1': 10,
    },
    description: 'Mesh back lumbar support adjustable height swivel chair.',
    createdAt: '2026-02-05T09:00:00Z',
    updatedAt: '2026-09-22T16:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'M8 Stainless Hex Bolts',
    sku: 'CMP-BLT-M8',
    category: 'Components & Fasteners',
    unitOfMeasure: 'Boxes (box)',
    currentStock: 120,
    minStockAlert: 25,
    costPrice: 12.0,
    sellingPrice: 24.5,
    locationStock: {
      'WH-MAIN / Rack B': 80,
      'WH-PROD / Production Floor': 40,
    },
    description: 'Standard M8x30mm hex head 304 stainless grade.',
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-09-24T11:15:00Z',
  },
  {
    id: 'prod-4',
    name: 'Corrugated Shipping Box (L)',
    sku: 'PKG-BOX-LRG',
    category: 'Packaging',
    unitOfMeasure: 'Units (pcs)',
    currentStock: 5,
    minStockAlert: 50, // severely low stock!
    costPrice: 1.2,
    sellingPrice: 2.8,
    locationStock: {
      'WH-MAIN / Packing Zone': 5,
    },
    description: 'Heavy duty double wall 50x40x30cm packing carton.',
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-09-25T08:45:00Z',
  },
];

export const INITIAL_OPERATIONS: OperationDocument[] = [
  {
    id: 'op-rec-001',
    documentNumber: 'REC-2026-0041',
    type: 'receipt',
    status: 'done',
    partner: 'Apex Steel Industries',
    destinationLocation: 'WH-MAIN / Rack A',
    items: [
      {
        productId: 'prod-1',
        productName: 'Steel Rods (12mm)',
        sku: 'RAW-STL-12MM',
        quantity: 100,
        unitOfMeasure: 'Kilograms (kg)',
      },
    ],
    notes: 'Received bulk shipment batch #B-998.',
    createdAt: '2026-09-25T09:15:00Z',
    scheduledDate: '2026-09-25T12:00:00Z',
    validatedAt: '2026-09-25T11:40:00Z',
    validatedBy: 'Sarah Connor (Inventory Manager)',
  },
  {
    id: 'op-del-001',
    documentNumber: 'DEL-2026-0112',
    type: 'delivery',
    status: 'ready',
    partner: 'Modern Workspaces Corp',
    sourceLocation: 'WH-MAIN / Packing Zone',
    items: [
      {
        productId: 'prod-2',
        productName: 'Ergonomic Office Chair',
        sku: 'FGD-CHR-ERG',
        quantity: 10,
        unitOfMeasure: 'Units (pcs)',
      },
    ],
    notes: 'Priority corporate order courier dispatch.',
    createdAt: '2026-09-25T14:00:00Z',
    scheduledDate: '2026-09-26T15:00:00Z',
  },
  {
    id: 'op-int-001',
    documentNumber: 'INT-2026-0089',
    type: 'internal',
    status: 'waiting',
    sourceLocation: 'WH-MAIN / Rack A',
    destinationLocation: 'WH-PROD / Production Floor',
    items: [
      {
        productId: 'prod-1',
        productName: 'Steel Rods (12mm)',
        sku: 'RAW-STL-12MM',
        quantity: 50,
        unitOfMeasure: 'Kilograms (kg)',
      },
    ],
    notes: 'Shift transfer for assembly batch #A4.',
    createdAt: '2026-09-26T08:00:00Z',
    scheduledDate: '2026-09-26T10:00:00Z',
  },
  {
    id: 'op-adj-001',
    documentNumber: 'ADJ-2026-0019',
    type: 'adjustment',
    status: 'draft',
    sourceLocation: 'WH-MAIN / Packing Zone',
    items: [
      {
        productId: 'prod-4',
        productName: 'Corrugated Shipping Box (L)',
        sku: 'PKG-BOX-LRG',
        quantity: -3,
        unitOfMeasure: 'Units (pcs)',
      },
    ],
    notes: '3 water damaged units removed after inspection.',
    createdAt: '2026-09-26T08:45:00Z',
  },
];

export const INITIAL_MOVE_HISTORY: MoveHistoryRecord[] = [
  {
    id: 'mv-1',
    date: '2026-09-25T11:40:00Z',
    referenceNumber: 'REC-2026-0041',
    documentType: 'receipt',
    productName: 'Steel Rods (12mm)',
    sku: 'RAW-STL-12MM',
    fromLocation: 'Vendor (Apex Steel)',
    toLocation: 'WH-MAIN / Rack A',
    quantityChange: 100,
    unitOfMeasure: 'Kilograms (kg)',
    user: 'Sarah Connor',
  },
  {
    id: 'mv-2',
    date: '2026-09-24T16:20:00Z',
    referenceNumber: 'DEL-2026-0108',
    documentType: 'delivery',
    productName: 'Ergonomic Office Chair',
    sku: 'FGD-CHR-ERG',
    fromLocation: 'WH-MAIN / Packing Zone',
    toLocation: 'Customer (TechCorp Inc)',
    quantityChange: -5,
    unitOfMeasure: 'Units (pcs)',
    user: 'Alex Miller',
  },
  {
    id: 'mv-3',
    date: '2026-09-23T14:10:00Z',
    referenceNumber: 'INT-2026-0082',
    documentType: 'internal',
    productName: 'M8 Stainless Hex Bolts',
    sku: 'CMP-BLT-M8',
    fromLocation: 'WH-MAIN / Rack B',
    toLocation: 'WH-PROD / Production Floor',
    quantityChange: 20,
    unitOfMeasure: 'Boxes (box)',
    user: 'Alex Miller',
  },
  {
    id: 'mv-4',
    date: '2026-09-22T09:30:00Z',
    referenceNumber: 'ADJ-2026-0015',
    documentType: 'adjustment',
    productName: 'Steel Rods (12mm)',
    sku: 'RAW-STL-12MM',
    fromLocation: 'WH-MAIN / Rack A',
    toLocation: 'Inventory Loss (Scrap)',
    quantityChange: -3,
    unitOfMeasure: 'Kilograms (kg)',
    user: 'Sarah Connor',
  },
];
