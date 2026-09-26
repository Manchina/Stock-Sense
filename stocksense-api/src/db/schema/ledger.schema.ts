import { pgTable, uuid, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { ledgerSourceTypeEnum } from "./enums";
import { products } from "./products.schema";
import { locations } from "./warehouses.schema";
import { users } from "./users.schema";

/**
 * Immutable Stock Ledger
 * Strictly append-only audit log for all stock movements across all warehouses.
 * Single source of truth for Move History and balance integrity.
 */
export const stockLedger = pgTable(
  "stock_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id)
      .notNull(),
    deltaQty: integer("delta_qty").notNull(),
    sourceType: ledgerSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id"),
    balanceAfter: integer("balance_after").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("stock_ledger_product_idx").on(table.productId),
    index("stock_ledger_location_idx").on(table.locationId),
    index("stock_ledger_source_type_idx").on(table.sourceType),
    index("stock_ledger_source_id_idx").on(table.sourceId),
    index("stock_ledger_created_at_idx").on(table.createdAt),
  ]
);
