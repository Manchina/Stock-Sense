import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { transfers, transferLines } from "../../db/schema/transfers.schema";
import { updateTransferSchema } from "./transfer.schema";
import {
  resolveLocation,
  resolveProduct,
  resolveUserId,
  formatTransferResponse,
} from "./transfer.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * PUT /api/v1/transfers/:id & PATCH /api/v1/transfers/:id
 * Update an internal transfer. If moving status to 'done', stock movements are triggered atomically.
 */
export async function updateTransferHandler(c: Context) {
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

    const body = await c.req.json();
    const parsed = updateTransferSchema.safeParse(body);

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

    // 1. Fetch existing transfer with relations
    const existing = await db.query.transfers.findFirst({
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
        lines: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: `Transfer '${idParam}' not found`,
        },
        404
      );
    }

    const wasAlreadyDone = existing.status === "done";
    const isNowDone = data.status === "done";

    if (wasAlreadyDone && data.status && data.status !== "done") {
      return c.json(
        {
          success: false,
          message: "Completed transfers cannot be reverted to other statuses.",
        },
        400
      );
    }

    const userId = await resolveUserId(data.userId);
    const now = new Date();

    // 2. Resolve updated locations if provided
    let newSourceLocId = existing.sourceLocationId;
    let newDestLocId = existing.destLocationId;
    let sourceLabel = existing.sourceLocation?.warehouse
      ? `${existing.sourceLocation.warehouse.code} / ${existing.sourceLocation.name}`
      : existing.sourceLocation?.name || "Source";
    let destLabel = existing.destLocation?.warehouse
      ? `${existing.destLocation.warehouse.code} / ${existing.destLocation.name}`
      : existing.destLocation?.name || "Destination";

    if (data.sourceLocationId || data.sourceLocation) {
      const srcLoc = await resolveLocation(
        data.sourceLocationId,
        data.sourceLocation
      );
      if (srcLoc) {
        newSourceLocId = srcLoc.id;
        sourceLabel = srcLoc.fullLabel;
      }
    }

    if (data.destLocationId || data.destinationLocation) {
      const dstLoc = await resolveLocation(
        data.destLocationId,
        data.destinationLocation
      );
      if (dstLoc) {
        newDestLocId = dstLoc.id;
        destLabel = dstLoc.fullLabel;
      }
    }

    if (newSourceLocId === newDestLocId) {
      return c.json(
        {
          success: false,
          message: "Source and destination locations cannot be the same.",
        },
        400
      );
    }

    // 3. Resolve items if updating lines
    let itemsToProcess = existing.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
    }));

    if (data.items && data.items.length > 0) {
      if (wasAlreadyDone) {
        return c.json(
          {
            success: false,
            message: "Cannot modify line items of a completed transfer.",
          },
          400
        );
      }

      itemsToProcess = [];
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
              message: `Product '${item.productName || item.sku || item.productId}' not found.`,
            },
            400
          );
        }
        itemsToProcess.push({
          productId: prod.id,
          quantity: item.quantity,
        });
      }
    }

    // 4. Atomic Transaction for status advance & stock execution
    await db.transaction(async (tx) => {
      // Update line items if provided and wasn't already done
      if (data.items && data.items.length > 0 && !wasAlreadyDone) {
        await tx
          .delete(transferLines)
          .where(eq(transferLines.transferId, existing.id));

        for (const item of itemsToProcess) {
          await tx.insert(transferLines).values({
            transferId: existing.id,
            productId: item.productId,
            quantity: item.quantity,
            createdAt: now,
          });
        }
      }

      // If transitioning from non-done to 'done', execute stock ledger movements
      if (!wasAlreadyDone && isNowDone) {
        for (const item of itemsToProcess) {
          // Outflow from source (-qty)
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: newSourceLocId,
            deltaQty: -item.quantity,
            sourceType: "transfer",
            sourceId: existing.id,
            notes: `Transfer Out to ${destLabel} (${existing.transferNumber})`,
            userId,
            allowNegative: false,
          });

          // Inflow to destination (+qty)
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: newDestLocId,
            deltaQty: item.quantity,
            sourceType: "transfer",
            sourceId: existing.id,
            notes: `Transfer In from ${sourceLabel} (${existing.transferNumber})`,
            userId,
            allowNegative: true,
          });
        }
      }

      // Update transfer record
      await tx
        .update(transfers)
        .set({
          sourceLocationId: newSourceLocId,
          destLocationId: newDestLocId,
          status: data.status || existing.status,
          notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes,
          validatedAt: !wasAlreadyDone && isNowDone ? now : existing.validatedAt,
          validatedBy: !wasAlreadyDone && isNowDone ? userId : existing.validatedBy,
          updatedAt: now,
        })
        .where(eq(transfers.id, existing.id));
    });

    // 5. Fetch updated transfer
    const updated = await db.query.transfers.findFirst({
      where: eq(transfers.id, existing.id),
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

    return c.json({
      success: true,
      message: isNowDone && !wasAlreadyDone
        ? `Transfer ${existing.transferNumber} validated and stock moved successfully.`
        : `Transfer ${existing.transferNumber} updated successfully.`,
      data: formatTransferResponse(updated),
    });
  } catch (error: any) {
    console.error("Error updating transfer:", error);
    const isInsufficient = error.name === "InsufficientStockError";
    return c.json(
      {
        success: false,
        message: error.message || "Failed to update transfer",
      },
      isInsufficient ? 400 : 500
    );
  }
}
