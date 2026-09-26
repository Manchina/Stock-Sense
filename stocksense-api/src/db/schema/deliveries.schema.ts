import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { operationStatusEnum } from "./enums";
import { warehouses, locations } from "./warehouses.schema";
import { users } from "./users.schema";
import { products } from "./products.schema";

export const deliveryOrders = pgTable(
  "delivery_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerRef: varchar("customer_ref", { length: 100 }),
    sourceWarehouseId: uuid("source_warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    sourceLocationId: uuid("source_location_id").references(() => locations.id),
    status: operationStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    validatedBy: uuid("validated_by").references(() => users.id),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deliveries_number_idx").on(table.orderNumber),
    index("deliveries_status_idx").on(table.status),
    index("deliveries_source_warehouse_idx").on(table.sourceWarehouseId),
    index("deliveries_created_by_idx").on(table.createdBy),
  ]
);

export const deliveryLines = pgTable(
  "delivery_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deliveryId: uuid("delivery_id")
      .references(() => deliveryOrders.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    qtyOrdered: integer("qty_ordered").notNull(),
    qtyPicked: integer("qty_picked").default(0).notNull(),
    qtyDelivered: integer("qty_delivered").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("delivery_lines_delivery_idx").on(table.deliveryId),
    index("delivery_lines_product_idx").on(table.productId),
  ]
);
