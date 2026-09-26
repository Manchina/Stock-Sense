import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Export enums
export * from "./enums";

// Export tables
export * from "./users.schema";
export * from "./warehouses.schema";
export * from "./categories.schema";
export * from "./products.schema";
export * from "./stock-levels.schema";
export * from "./reorder-rules.schema";
export * from "./receipts.schema";
export * from "./deliveries.schema";
export * from "./transfers.schema";
export * from "./adjustments.schema";
export * from "./ledger.schema";
export * from "./audit.schema";

// Export relations
export * from "./relations";

// Import tables for type inference
import { users, otpCodes } from "./users.schema";
import { warehouses, locations } from "./warehouses.schema";
import { categories } from "./categories.schema";
import { products } from "./products.schema";
import { stockLevels } from "./stock-levels.schema";
import { reorderRules } from "./reorder-rules.schema";
import { receipts, receiptLines } from "./receipts.schema";
import { deliveryOrders, deliveryLines } from "./deliveries.schema";
import { transfers, transferLines } from "./transfers.schema";
import { adjustments, adjustmentLines } from "./adjustments.schema";
import { stockLedger } from "./ledger.schema";
import { auditLog } from "./audit.schema";

// Inferred TypeScript Models
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type OtpCode = InferSelectModel<typeof otpCodes>;
export type NewOtpCode = InferInsertModel<typeof otpCodes>;

export type Warehouse = InferSelectModel<typeof warehouses>;
export type NewWarehouse = InferInsertModel<typeof warehouses>;

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type StockLevel = InferSelectModel<typeof stockLevels>;
export type NewStockLevel = InferInsertModel<typeof stockLevels>;

export type ReorderRule = InferSelectModel<typeof reorderRules>;
export type NewReorderRule = InferInsertModel<typeof reorderRules>;

export type Receipt = InferSelectModel<typeof receipts>;
export type NewReceipt = InferInsertModel<typeof receipts>;
export type ReceiptLine = InferSelectModel<typeof receiptLines>;
export type NewReceiptLine = InferInsertModel<typeof receiptLines>;

export type DeliveryOrder = InferSelectModel<typeof deliveryOrders>;
export type NewDeliveryOrder = InferInsertModel<typeof deliveryOrders>;
export type DeliveryLine = InferSelectModel<typeof deliveryLines>;
export type NewDeliveryLine = InferInsertModel<typeof deliveryLines>;

export type Transfer = InferSelectModel<typeof transfers>;
export type NewTransfer = InferInsertModel<typeof transfers>;
export type TransferLine = InferSelectModel<typeof transferLines>;
export type NewTransferLine = InferInsertModel<typeof transferLines>;

export type Adjustment = InferSelectModel<typeof adjustments>;
export type NewAdjustment = InferInsertModel<typeof adjustments>;
export type AdjustmentLine = InferSelectModel<typeof adjustmentLines>;
export type NewAdjustmentLine = InferInsertModel<typeof adjustmentLines>;

export type StockLedgerEntry = InferSelectModel<typeof stockLedger>;
export type NewStockLedgerEntry = InferInsertModel<typeof stockLedger>;

export type AuditLogEntry = InferSelectModel<typeof auditLog>;
export type NewAuditLogEntry = InferInsertModel<typeof auditLog>;
