import type { Handler } from "hono";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { stockLedger } from "../../db/schema/ledger.schema";
import { products } from "../../db/schema/products.schema";
import { locations, warehouses } from "../../db/schema/warehouses.schema";
import { users } from "../../db/schema/users.schema";

export const getHistoryHandler: Handler = async (c) => {
  const query = c.req.query();
  const page = Math.max(1, parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50", 10)));
  const offset = (page - 1) * limit;

  const { type, productId, locationId, warehouseId, search } = query;

  const conditions = [];

  if (type && type !== "all") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(eq(stockLedger.sourceType, type as any));
  }

  if (productId) {
    conditions.push(eq(stockLedger.productId, productId));
  }

  if (locationId) {
    conditions.push(eq(stockLedger.locationId, locationId));
  }

  if (warehouseId) {
    conditions.push(eq(locations.warehouseId, warehouseId));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        ilike(products.name, searchPattern),
        ilike(products.sku, searchPattern),
        ilike(locations.name, searchPattern),
        ilike(warehouses.name, searchPattern),
        ilike(users.name, searchPattern),
        ilike(stockLedger.notes, searchPattern)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Execute query with joins
  const entries = await db
    .select({
      id: stockLedger.id,
      productId: stockLedger.productId,
      productName: products.name,
      sku: products.sku,
      uom: products.uom,
      locationId: stockLedger.locationId,
      locationName: locations.name,
      locationCode: locations.code,
      warehouseId: locations.warehouseId,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      deltaQty: stockLedger.deltaQty,
      sourceType: stockLedger.sourceType,
      sourceId: stockLedger.sourceId,
      balanceAfter: stockLedger.balanceAfter,
      notes: stockLedger.notes,
      createdBy: stockLedger.createdBy,
      createdByName: users.name,
      createdAt: stockLedger.createdAt,
    })
    .from(stockLedger)
    .leftJoin(products, eq(stockLedger.productId, products.id))
    .leftJoin(locations, eq(stockLedger.locationId, locations.id))
    .leftJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockLedger.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(stockLedger.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockLedger)
    .leftJoin(products, eq(stockLedger.productId, products.id))
    .leftJoin(locations, eq(stockLedger.locationId, locations.id))
    .leftJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockLedger.createdBy, users.id))
    .where(whereClause);

  const total = countResult[0]?.count ?? 0;

  return c.json({
    data: entries,
    pagination: {
      page,
      limit,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limit),
    },
  });
};
