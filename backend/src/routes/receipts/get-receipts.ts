import { Context } from "hono";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts } from "../../db/schema/receipts.schema";
import { formatReceiptResponse } from "./receipt.helper";

/**
 * GET /api/v1/receipts
 * Fetch all goods receipts with filters (status, search query, warehouseId, pagination).
 */
export async function getReceiptsHandler(c: Context) {
  try {
    const search = c.req.query("search")?.trim();
    const status = c.req.query("status")?.trim();
    const warehouseId = c.req.query("warehouseId")?.trim();
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(1000, Math.max(1, parseInt(c.req.query("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(receipts.status, status as any));
    }

    if (warehouseId) {
      conditions.push(eq(receipts.destinationWarehouseId, warehouseId));
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(receipts.receiptNumber, searchPattern),
          ilike(receipts.supplierName, searchPattern),
          ilike(receipts.notes, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allReceipts = await db.query.receipts.findMany({
      where: whereClause,
      with: {
        destinationWarehouse: true,
        destinationLocation: {
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
      orderBy: [desc(receipts.createdAt)],
      limit,
      offset,
    });

    const formatted = allReceipts.map(formatReceiptResponse);

    return c.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve receipts",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
