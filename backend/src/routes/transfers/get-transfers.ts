import { Context } from "hono";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { transfers } from "../../db/schema/transfers.schema";
import { formatTransferResponse } from "./transfer.helper";

/**
 * GET /api/v1/transfers
 * List internal transfers with optional status, search, and pagination filters.
 */
export async function getTransfersHandler(c: Context) {
  try {
    const query = c.req.query();
    const status = query.status;
    const search = query.search?.trim();

    const conditions = [];

    if (status && status !== "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(eq(transfers.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(transfers.transferNumber, `%${search}%`),
          ilike(transfers.notes, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.transfers.findMany({
      where: whereClause,
      with: {
        sourceLocation: {
          with: { warehouse: true },
        },
        destLocation: {
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
      orderBy: [desc(transfers.createdAt)],
    });

    const formatted = results.map(formatTransferResponse);

    return c.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Error fetching transfers:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve internal transfers",
        error: error.message || String(error),
      },
      500
    );
  }
}
