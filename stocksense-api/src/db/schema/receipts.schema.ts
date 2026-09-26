import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { operationStatusEnum } from "./enums";
import { warehouses, locations } from "./warehouses.schema";
import { users } from "./users.schema";
import { products } from "./products.schema";

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptNumber: varchar("receipt_number", { length: 100 }).notNull().unique(),
    supplierName: varchar("supplier_name", { length: 255 }).notNull(),
    destinationWarehouseId: uuid("destination_warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    destinationLocationId: uuid("destination_location_id").references(() => locations.id),
    status: operationStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    expectedDate: timestamp("expected_date", { withTimezone: true }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("receipts_number_idx").on(table.receiptNumber),
    index("receipts_status_idx").on(table.status),
    index("receipts_dest_warehouse_idx").on(table.destinationWarehouseId),
    index("receipts_created_by_idx").on(table.createdBy),
  ]
);

export const receiptLines = pgTable(
  "receipt_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptId: uuid("receipt_id")
      .references(() => receipts.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    qtyExpected: integer("qty_expected").notNull(),
    qtyReceived: integer("qty_received").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("receipt_lines_receipt_idx").on(table.receiptId),
    index("receipt_lines_product_idx").on(table.productId),
  ]
);
