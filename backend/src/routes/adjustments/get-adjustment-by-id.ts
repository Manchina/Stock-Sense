import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { adjustments } from "../../db/schema/adjustments.schema";
import { formatAdjustmentResponse } from "./adjustment.helper";

/**
 * GET /api/v1/adjustments/:id
 * Retrieve single stock adjustment by UUID or Adjustment Number.
 */
export async function getAdjustmentByIdHandler(c: Context) {
  try {
    const idParam = c.req.param("id");

    if (!idParam) {
      return c.json(
        {
          success: false,
          message: "Adjustment ID is required",
        },
        400
      );
    }

    const adjustment = await db.query.adjustments.findFirst({
      where: or(
        eq(adjustments.id, idParam),
        eq(adjustments.adjustmentNumber, idParam)
      ),
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
    });

    if (!adjustment) {
      return c.json(
        {
          success: false,
          message: `Adjustment '${idParam}' not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: formatAdjustmentResponse(adjustment),
    });
  } catch (error: any) {
    console.error("Error retrieving adjustment:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve adjustment details",
        error: error.message || String(error),
      },
      500
    );
  }
}
