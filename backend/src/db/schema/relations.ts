import { relations } from "drizzle-orm";
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

// Users relations
export const usersRelations = relations(users, ({ many }) => ({
  otpCodes: many(otpCodes),
  createdReceipts: many(receipts, { relationName: "receipts_creator" }),
  validatedReceipts: many(receipts, { relationName: "receipts_validator" }),
  createdDeliveries: many(deliveryOrders, { relationName: "deliveries_creator" }),
  validatedDeliveries: many(deliveryOrders, { relationName: "deliveries_validator" }),
  createdTransfers: many(transfers, { relationName: "transfers_creator" }),
  validatedTransfers: many(transfers, { relationName: "transfers_validator" }),
  createdAdjustments: many(adjustments, { relationName: "adjustments_creator" }),
  appliedAdjustments: many(adjustments, { relationName: "adjustments_applier" }),
  ledgerEntries: many(stockLedger),
  auditLogs: many(auditLog),
}));

// OTP codes relations
export const otpCodesRelations = relations(otpCodes, ({ one }) => ({
  user: one(users, {
    fields: [otpCodes.userId],
    references: [users.id],
  }),
}));

// Warehouses relations
export const warehousesRelations = relations(warehouses, ({ many }) => ({
  locations: many(locations),
  receipts: many(receipts),
  deliveryOrders: many(deliveryOrders),
}));

// Locations relations
export const locationsRelations = relations(locations, ({ one, many }) => ({
  warehouse: one(warehouses, {
    fields: [locations.warehouseId],
    references: [warehouses.id],
  }),
  stockLevels: many(stockLevels),
  reorderRules: many(reorderRules),
  outgoingTransfers: many(transfers, { relationName: "transfers_source_location" }),
  incomingTransfers: many(transfers, { relationName: "transfers_dest_location" }),
  adjustments: many(adjustments),
  ledgerEntries: many(stockLedger),
}));

// Categories relations (hierarchical parent-child)
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent_children",
  }),
  children: many(categories, {
    relationName: "category_parent_children",
  }),
  products: many(products),
}));

// Products relations
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockLevels: many(stockLevels),
  reorderRules: many(reorderRules),
  receiptLines: many(receiptLines),
  deliveryLines: many(deliveryLines),
  transferLines: many(transferLines),
  adjustmentLines: many(adjustmentLines),
  ledgerEntries: many(stockLedger),
}));

// Stock levels relations
export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  product: one(products, {
    fields: [stockLevels.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stockLevels.locationId],
    references: [locations.id],
  }),
}));

// Reorder rules relations
export const reorderRulesRelations = relations(reorderRules, ({ one }) => ({
  product: one(products, {
    fields: [reorderRules.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [reorderRules.locationId],
    references: [locations.id],
  }),
}));

// Receipts relations
export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  destinationWarehouse: one(warehouses, {
    fields: [receipts.destinationWarehouseId],
    references: [warehouses.id],
  }),
  destinationLocation: one(locations, {
    fields: [receipts.destinationLocationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [receipts.createdBy],
    references: [users.id],
    relationName: "receipts_creator",
  }),
  validator: one(users, {
    fields: [receipts.validatedBy],
    references: [users.id],
    relationName: "receipts_validator",
  }),
  lines: many(receiptLines),
}));

export const receiptLinesRelations = relations(receiptLines, ({ one }) => ({
  receipt: one(receipts, {
    fields: [receiptLines.receiptId],
    references: [receipts.id],
  }),
  product: one(products, {
    fields: [receiptLines.productId],
    references: [products.id],
  }),
}));

// Delivery orders relations
export const deliveryOrdersRelations = relations(deliveryOrders, ({ one, many }) => ({
  sourceWarehouse: one(warehouses, {
    fields: [deliveryOrders.sourceWarehouseId],
    references: [warehouses.id],
  }),
  sourceLocation: one(locations, {
    fields: [deliveryOrders.sourceLocationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [deliveryOrders.createdBy],
    references: [users.id],
    relationName: "deliveries_creator",
  }),
  validator: one(users, {
    fields: [deliveryOrders.validatedBy],
    references: [users.id],
    relationName: "deliveries_validator",
  }),
  lines: many(deliveryLines),
}));

export const deliveryLinesRelations = relations(deliveryLines, ({ one }) => ({
  delivery: one(deliveryOrders, {
    fields: [deliveryLines.deliveryId],
    references: [deliveryOrders.id],
  }),
  product: one(products, {
    fields: [deliveryLines.productId],
    references: [products.id],
  }),
}));

// Transfers relations
export const transfersRelations = relations(transfers, ({ one, many }) => ({
  sourceLocation: one(locations, {
    fields: [transfers.sourceLocationId],
    references: [locations.id],
    relationName: "transfers_source_location",
  }),
  destLocation: one(locations, {
    fields: [transfers.destLocationId],
    references: [locations.id],
    relationName: "transfers_dest_location",
  }),
  creator: one(users, {
    fields: [transfers.createdBy],
    references: [users.id],
    relationName: "transfers_creator",
  }),
  validator: one(users, {
    fields: [transfers.validatedBy],
    references: [users.id],
    relationName: "transfers_validator",
  }),
  lines: many(transferLines),
}));

export const transferLinesRelations = relations(transferLines, ({ one }) => ({
  transfer: one(transfers, {
    fields: [transferLines.transferId],
    references: [transfers.id],
  }),
  product: one(products, {
    fields: [transferLines.productId],
    references: [products.id],
  }),
}));

// Adjustments relations
export const adjustmentsRelations = relations(adjustments, ({ one, many }) => ({
  location: one(locations, {
    fields: [adjustments.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [adjustments.createdBy],
    references: [users.id],
    relationName: "adjustments_creator",
  }),
  applier: one(users, {
    fields: [adjustments.appliedBy],
    references: [users.id],
    relationName: "adjustments_applier",
  }),
  lines: many(adjustmentLines),
}));

export const adjustmentLinesRelations = relations(adjustmentLines, ({ one }) => ({
  adjustment: one(adjustments, {
    fields: [adjustmentLines.adjustmentId],
    references: [adjustments.id],
  }),
  product: one(products, {
    fields: [adjustmentLines.productId],
    references: [products.id],
  }),
}));

// Stock ledger relations
export const stockLedgerRelations = relations(stockLedger, ({ one }) => ({
  product: one(products, {
    fields: [stockLedger.productId],
    references: [products.id],
  }),
  location: one(locations, {
    fields: [stockLedger.locationId],
    references: [locations.id],
  }),
  creator: one(users, {
    fields: [stockLedger.createdBy],
    references: [users.id],
  }),
}));

// Audit log relations
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));
