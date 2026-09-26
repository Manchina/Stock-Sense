import { Context } from "hono";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { adjustments } from "../../db/schema/adjustments.schema";
import { formatAdjustmentResponse } from "./adjustment.helper";

/**
 * GET /api/v1/adjustments
 * List stock adjustments with optional status and search filters.
 */
export async function getAdjustmentsHandler(c: Context) {
  try {
    const query = c.req.query();
    const status = query.status;
    const search = query.search?.trim();

    const conditions = [];

    if (status && status !== "all") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(eq(adjustments.status, status as any));
    }

    if (search) {
      conditions.push(
        or(
          ilike(adjustments.adjustmentNumber, `%${search}%`),
          ilike(adjustments.reason, `%${search}%`),
          ilike(adjustments.notes, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db.query.adjustments.findMany({
      where: whereClause,
      with: {
        location: {
          with: { warehouse: true },
        },
        creator: true,
        applier: true,
        lines: {
          with: {
            product: true,
          },
        },
      },
      orderBy: [desc(adjustments.createdAt)],
    });

    const formatted = results.map(formatAdjustmentResponse);

    return c.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Error fetching adjustments:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve stock adjustments",
        error: error.message || String(error),
      },
      500
    );
  }
}
