import { pgTable, uuid, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { products } from "./products.schema";
import { locations } from "./warehouses.schema";

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    quantity: integer("quantity").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("stock_levels_product_location_unique").on(table.productId, table.locationId),
    index("stock_levels_product_idx").on(table.productId),
    index("stock_levels_location_idx").on(table.locationId),
  ]
);
