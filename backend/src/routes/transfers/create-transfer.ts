import { Context } from "hono";
import { db } from "../../config/db";
import { transfers, transferLines } from "../../db/schema/transfers.schema";
import { createTransferSchema } from "./transfer.schema";
import {
  resolveLocation,
  resolveProduct,
  resolveUserId,
  generateTransferNumber,
  formatTransferResponse,
} from "./transfer.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * POST /api/v1/transfers
 * Create a new internal transfer order.
 * If status is 'done', stock movement is executed immediately inside the transaction.
 */
export async function createTransferHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createTransferSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.format(),
        },
        400
      );
    }

    const data = parsed.data;

    // 1. Resolve source and destination locations
    const sourceLoc = await resolveLocation(
      data.sourceLocationId,
      data.sourceLocation
    );
    if (!sourceLoc) {
      return c.json(
        {
          success: false,
          message: "Could not resolve valid source location.",
        },
        400
      );
    }

    const destLoc = await resolveLocation(
      data.destLocationId || data.destinationLocationId,
      data.destinationLocation || data.destLocation
    );
    if (!destLoc) {
      return c.json(
        {
          success: false,
          message: "Could not resolve valid destination location.",
        },
        400
      );
    }

    if (sourceLoc.id === destLoc.id) {
      return c.json(
        {
          success: false,
          message: "Source location and destination location cannot be identical.",
        },
        400
      );
    }

    // 2. Resolve items and check product existence
    const resolvedItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
    }> = [];

    for (const item of data.items) {
      const prod = await resolveProduct(
        item.productId,
        item.sku,
        item.productName
      );
      if (!prod) {
        return c.json(
          {
            success: false,
            message: `Product '${item.productName || item.sku || item.productId}' could not be resolved.`,
          },
          400
        );
      }
      resolvedItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: item.quantity,
      });
    }

    // 3. Resolve user operator
    const userId = await resolveUserId(data.userId);
    const transferNumber =
      data.transferNumber ||
      data.documentNumber ||
      (await generateTransferNumber());

    const isDone = data.status === "done";
    const now = new Date();

    // 4. Atomic execution
    const createdTransferId = await db.transaction(async (tx) => {
      // Insert transfer header
      const [insertedTransfer] = await tx
        .insert(transfers)
        .values({
          transferNumber,
          sourceLocationId: sourceLoc.id,
          destLocationId: destLoc.id,
          status: data.status,
          notes: data.notes?.trim() || null,
          validatedAt: isDone ? now : null,
          validatedBy: isDone ? userId : null,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!insertedTransfer) {
        throw new Error("Failed to insert transfer header");
      }

      // Insert line items
      for (const item of resolvedItems) {
        await tx.insert(transferLines).values({
          transferId: insertedTransfer.id,
          productId: item.productId,
          quantity: item.quantity,
          createdAt: now,
        });

        // If created in 'done' status, execute dual-entry stock movement
        if (isDone) {
          // Outflow from source (-qty)
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: sourceLoc.id,
            deltaQty: -item.quantity,
            sourceType: "transfer",
            sourceId: insertedTransfer.id,
            notes: `Transfer Out to ${destLoc.fullLabel} (${transferNumber})`,
            userId,
            allowNegative: false,
          });

          // Inflow to destination (+qty)
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: destLoc.id,
            deltaQty: item.quantity,
            sourceType: "transfer",
            sourceId: insertedTransfer.id,
            notes: `Transfer In from ${sourceLoc.fullLabel} (${transferNumber})`,
            userId,
            allowNegative: true,
          });
        }
      }

      return insertedTransfer.id;
    });

    // 5. Fetch full created transfer with joins
    const fullTransfer = await db.query.transfers.findFirst({
      where: (t, { eq }) => eq(t.id, createdTransferId),
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

    return c.json(
      {
        success: true,
        message: isDone
          ? `Internal transfer ${transferNumber} created and stock moved successfully.`
          : `Internal transfer ${transferNumber} saved in ${data.status} state.`,
        data: formatTransferResponse(fullTransfer),
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating transfer:", error);
    const isInsufficient = error.name === "InsufficientStockError";
    return c.json(
      {
        success: false,
        message: error.message || "Failed to create internal transfer",
      },
      isInsufficient ? 400 : 500
    );
  }
}
