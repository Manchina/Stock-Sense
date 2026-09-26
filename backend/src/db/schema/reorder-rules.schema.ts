import { pgTable, uuid, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { products } from "./products.schema";
import { locations } from "./warehouses.schema";

export const reorderRules = pgTable(
  "reorder_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    minQty: integer("min_qty").default(0).notNull(),
    maxQty: integer("max_qty").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("reorder_rules_product_location_unique").on(table.productId, table.locationId),
    index("reorder_rules_product_idx").on(table.productId),
    index("reorder_rules_location_idx").on(table.locationId),
  ]
);
