import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { operationStatusEnum } from "./enums";
import { locations } from "./warehouses.schema";
import { users } from "./users.schema";
import { products } from "./products.schema";

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transferNumber: varchar("transfer_number", { length: 100 }).notNull().unique(),
    sourceLocationId: uuid("source_location_id")
      .references(() => locations.id)
      .notNull(),
    destLocationId: uuid("dest_location_id")
      .references(() => locations.id)
      .notNull(),
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
    index("transfers_number_idx").on(table.transferNumber),
    index("transfers_status_idx").on(table.status),
    index("transfers_source_location_idx").on(table.sourceLocationId),
    index("transfers_dest_location_idx").on(table.destLocationId),
    index("transfers_created_by_idx").on(table.createdBy),
  ]
);

export const transferLines = pgTable(
  "transfer_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transferId: uuid("transfer_id")
      .references(() => transfers.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    quantity: integer("quantity").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transfer_lines_transfer_idx").on(table.transferId),
    index("transfer_lines_product_idx").on(table.productId),
  ]
);
