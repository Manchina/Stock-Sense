import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { operationStatusEnum } from "./enums";
import { locations } from "./warehouses.schema";
import { users } from "./users.schema";
import { products } from "./products.schema";

export const adjustments = pgTable(
  "adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adjustmentNumber: varchar("adjustment_number", { length: 100 }).notNull().unique(),
    locationId: uuid("location_id")
      .references(() => locations.id)
      .notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    status: operationStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    appliedBy: uuid("applied_by").references(() => users.id),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("adjustments_number_idx").on(table.adjustmentNumber),
    index("adjustments_status_idx").on(table.status),
    index("adjustments_location_idx").on(table.locationId),
    index("adjustments_created_by_idx").on(table.createdBy),
  ]
);

export const adjustmentLines = pgTable(
  "adjustment_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adjustmentId: uuid("adjustment_id")
      .references(() => adjustments.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    recordedQty: integer("recorded_qty").notNull(),
    countedQty: integer("counted_qty").notNull(),
    deltaQty: integer("delta_qty").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("adjustment_lines_adjustment_idx").on(table.adjustmentId),
    index("adjustment_lines_product_idx").on(table.productId),
  ]
);
