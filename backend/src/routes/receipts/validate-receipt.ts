import { Context } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts, receiptLines } from "../../db/schema/receipts.schema";
import { locations } from "../../db/schema/warehouses.schema";
import { resolveDefaultUserId, formatReceiptResponse } from "./receipt.helper";
import { executeStockMovement, InsufficientStockError } from "../../services/stock.service";

/**
 * POST /api/v1/receipts/:id/validate
 * Validate a receipt, incrementing inventory stock levels and writing immutable stock ledger records.
 */
export async function validateReceiptHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Receipt ID is required" }, 400);
    }

    const existingReceipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
      with: {
        destinationWarehouse: true,
        destinationLocation: true,
        lines: {
          with: { product: true },
        },
      },
    });

    if (!existingReceipt) {
      return c.json({ success: false, message: `Receipt with ID '${id}' not found` }, 404);
    }

    if (existingReceipt.status === "done") {
      return c.json(
        {
          success: false,
          message: `Receipt '${existingReceipt.receiptNumber}' has already been validated and processed.`,
        },
        400
      );
    }

    if (existingReceipt.status === "canceled") {
      return c.json(
        {
          success: false,
          message: `Cannot validate canceled receipt '${existingReceipt.receiptNumber}'.`,
        },
        400
      );
    }

    // Ensure we have a destination location to credit
    let targetLocationId = existingReceipt.destinationLocationId;
    if (!targetLocationId) {
      // Find first location in the warehouse
      const firstLoc = await db.query.locations.findFirst({
        where: eq(locations.warehouseId, existingReceipt.destinationWarehouseId),
      });
      targetLocationId = firstLoc?.id || null;
    }

    if (!targetLocationId) {
      return c.json(
        {
          success: false,
          message: "Cannot validate receipt: No warehouse storage location found to deposit stock.",
        },
        400
      );
    }

    const currentUser = c.get("user") as { id: string } | undefined;
    const userId = await resolveDefaultUserId(currentUser?.id);

    // Atomic validation & ledger write
    await db.transaction(async (tx) => {
      // 1. Conditional update to prevent concurrent double-credit
      const [lockedReceipt] = await tx
        .update(receipts)
        .set({
          status: "done",
          destinationLocationId: targetLocationId,
          validatedAt: new Date(),
          validatedBy: userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(receipts.id, id),
            ne(receipts.status, "done"),
            ne(receipts.status, "canceled")
          )
        )
        .returning();

      if (!lockedReceipt) {
        throw new Error(
          `Receipt '${existingReceipt.receiptNumber}' has already been processed or canceled by another request.`
        );
      }

      // 2. Iterate each line item, mark qtyReceived = qtyExpected, and execute stock movement
      for (const line of existingReceipt.lines) {
        const receivedQty = line.qtyReceived > 0 ? line.qtyReceived : line.qtyExpected;

        await tx
          .update(receiptLines)
          .set({ qtyReceived: receivedQty })
          .where(eq(receiptLines.id, line.id));

        // Increment stock balance & append to stock ledger (links directly to Move History)
        await executeStockMovement(tx, {
          productId: line.productId,
          locationId: targetLocationId!,
          deltaQty: receivedQty,
          sourceType: "receipt",
          sourceId: existingReceipt.id,
          notes: `Receipt ${existingReceipt.receiptNumber} from ${existingReceipt.supplierName}`,
          userId,
        });
      }
    });

    // 3. Fetch updated receipt
    const updatedReceipt = await db.query.receipts.findFirst({
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

    if (!updatedReceipt) {
      throw new Error("Failed to load validated receipt");
    }

    return c.json({
      success: true,
      message: `Receipt '${updatedReceipt.receiptNumber}' validated successfully (+stock incremented in ledger)`,
      data: formatReceiptResponse(updatedReceipt),
    });
  } catch (error) {
    console.error("Error validating receipt:", error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isClientError =
      error instanceof InsufficientStockError ||
      errorMsg.includes("Insufficient") ||
      errorMsg.includes("not found") ||
      errorMsg.includes("Cannot modify");

    return c.json(
      {
        success: false,
        message: errorMsg,
        error: errorMsg,
      },
      isClientError ? 400 : 500
    );
  }
}
