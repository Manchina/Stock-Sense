import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts } from "../../db/schema/receipts.schema";
import { formatReceiptResponse, isUuid } from "./receipt.helper";

/**
 * GET /api/v1/receipts/:id
 * Fetch single receipt document by UUID or receiptNumber (e.g. REC-2026-0001).
 */
export async function getReceiptByIdHandler(c: Context) {
  try {
    const idOrNumber = c.req.param("id");

    if (!idOrNumber) {
      return c.json(
        {
          success: false,
          message: "Receipt ID or Number is required",
        },
        400
      );
    }

    const conditions = [eq(receipts.receiptNumber, idOrNumber.toUpperCase())];
    if (isUuid(idOrNumber)) {
      conditions.push(eq(receipts.id, idOrNumber));
    }

    const receipt = await db.query.receipts.findFirst({
      where: or(...conditions),
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
    });

    if (!receipt) {
      return c.json(
        {
          success: false,
          message: `Receipt not found with identifier '${idOrNumber}'`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: formatReceiptResponse(receipt),
    });
  } catch (error) {
    console.error("Error fetching receipt by ID:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve receipt details",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
