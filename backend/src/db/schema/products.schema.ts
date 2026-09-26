import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { categories } from "./categories.schema";

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    uom: varchar("uom", { length: 50 }).default("unit").notNull(),
    reorderPoint: integer("reorder_point").default(0).notNull(),
    reorderQty: integer("reorder_qty").default(0).notNull(),
    costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("products_sku_idx").on(table.sku),
    index("products_category_idx").on(table.categoryId),
    index("products_is_active_idx").on(table.isActive),
  ]
);
