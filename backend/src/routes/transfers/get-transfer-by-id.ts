import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { transfers } from "../../db/schema/transfers.schema";
import { formatTransferResponse } from "./transfer.helper";

/**
 * GET /api/v1/transfers/:id
 * Retrieve single internal transfer by UUID or Transfer Number.
 */
export async function getTransferByIdHandler(c: Context) {
  try {
    const idParam = c.req.param("id");

    if (!idParam) {
      return c.json(
        {
          success: false,
          message: "Transfer ID is required",
        },
        400
      );
    }

    const transfer = await db.query.transfers.findFirst({
      where: or(
        eq(transfers.id, idParam),
        eq(transfers.transferNumber, idParam)
      ),
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
    });

    if (!transfer) {
      return c.json(
        {
          success: false,
          message: `Transfer '${idParam}' not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: formatTransferResponse(transfer),
    });
  } catch (error: any) {
    console.error("Error retrieving transfer:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve transfer details",
        error: error.message || String(error),
      },
      500
    );
  }
}
