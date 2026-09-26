import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts } from "../../db/schema/receipts.schema";
import { formatReceiptResponse } from "./receipt.helper";

/**
 * POST /api/v1/receipts/:id/cancel
 * Cancel a draft or waiting receipt.
 */
export async function cancelReceiptHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Receipt ID is required" }, 400);
    }

    const existingReceipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
    });

    if (!existingReceipt) {
      return c.json({ success: false, message: `Receipt with ID '${id}' not found` }, 404);
    }

    if (existingReceipt.status === "done") {
      return c.json(
        {
          success: false,
          message: "Cannot cancel a receipt that has already been validated. Use Inventory Adjustments to reverse stock.",
        },
        400
      );
    }

    await db
      .update(receipts)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, id));

    const updated = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
      with: {
        destinationWarehouse: true,
        destinationLocation: {
          with: { warehouse: true },
        },
        creator: true,
        validator: true,
        lines: {
          with: { product: true },
        },
      },
    });

    if (!updated) {
      throw new Error("Failed to load canceled receipt");
    }

    return c.json({
      success: true,
      message: `Receipt '${updated.receiptNumber}' was marked as canceled`,
      data: formatReceiptResponse(updated),
    });
  } catch (error) {
    console.error("Error canceling receipt:", error);
    return c.json(
      {
        success: false,
        message: "Failed to cancel receipt",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
