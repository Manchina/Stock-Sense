import { Context } from "hono";
import { eq, desc, and, or, ilike, inArray } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders, deliveryLines } from "../../db/schema/deliveries.schema";
import { products } from "../../db/schema/products.schema";
import { formatDeliveryResponse } from "./delivery.helper";

/**
 * GET /api/v1/deliveries
 * Fetch all outgoing delivery orders with filters (status, search query, warehouseId, pagination).
 */
export async function getDeliveriesHandler(c: Context) {
  try {
    const search = c.req.query("search")?.trim();
    const status = c.req.query("status")?.trim();
    const warehouseId = c.req.query("warehouseId")?.trim();
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(1000, Math.max(1, parseInt(c.req.query("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(deliveryOrders.status, status as any));
    }

    if (warehouseId) {
      conditions.push(eq(deliveryOrders.sourceWarehouseId, warehouseId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const searchOrConditions = [
        ilike(deliveryOrders.orderNumber, searchPattern),
        ilike(deliveryOrders.customerName, searchPattern),
        ilike(deliveryOrders.customerRef, searchPattern),
        ilike(deliveryOrders.notes, searchPattern),
      ];

      const matchingProducts = await db.query.products.findMany({
        where: or(ilike(products.name, searchPattern), ilike(products.sku, searchPattern)),
        columns: { id: true },
      });

      if (matchingProducts.length > 0) {
        const matchingLines = await db.query.deliveryLines.findMany({
          where: inArray(
            deliveryLines.productId,
            matchingProducts.map((p) => p.id)
          ),
          columns: { deliveryId: true },
        });

        const deliveryIds = matchingLines.map((l) => l.deliveryId);
        if (deliveryIds.length > 0) {
          searchOrConditions.push(inArray(deliveryOrders.id, deliveryIds));
        }
      }

      conditions.push(or(...searchOrConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allDeliveries = await db.query.deliveryOrders.findMany({
      where: whereClause,
      with: {
        sourceWarehouse: true,
        sourceLocation: {
          with: { warehouse: true },
        },
        creator: true,
        validator: true,
        lines: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(deliveryOrders.createdAt)],
      limit,
      offset,
    });

    const formatted = allDeliveries.map(formatDeliveryResponse);

    return c.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve delivery orders",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
