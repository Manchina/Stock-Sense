import { Context } from "hono";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { adjustments, adjustmentLines } from "../../db/schema/adjustments.schema";
import { stockLevels } from "../../db/schema/stock-levels.schema";
import { updateAdjustmentSchema } from "./adjustment.schema";
import {
  resolveLocation,
  resolveProduct,
  resolveUserId,
  formatAdjustmentResponse,
} from "./adjustment.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * PUT /api/v1/adjustments/:id & PATCH /api/v1/adjustments/:id
 * Update a stock adjustment. If moving status to 'done', stock level changes are applied to the ledger.
 */
export async function updateAdjustmentHandler(c: Context) {
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

    const body = await c.req.json();
    const parsed = updateAdjustmentSchema.safeParse(body);

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

    // 1. Fetch existing adjustment with lines
    const existing = await db.query.adjustments.findFirst({
      where: or(
        eq(adjustments.id, idParam),
        eq(adjustments.adjustmentNumber, idParam)
      ),
      with: {
        location: {
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
          message: `Adjustment '${idParam}' not found`,
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
          message: "Applied stock adjustments cannot be reverted.",
        },
        400
      );
    }

    const userId = await resolveUserId(data.userId);
    const now = new Date();

    // 2. Resolve updated location if provided
    let newLocationId = existing.locationId;
    if (data.locationId || data.location) {
      const loc = await resolveLocation(data.locationId, data.location);
      if (loc) {
        newLocationId = loc.id;
      }
    }

    // 3. Resolve items if updating lines
    let itemsToProcess = existing.lines.map((l) => ({
      productId: l.productId,
      recordedQty: l.recordedQty,
      countedQty: l.countedQty,
      deltaQty: l.deltaQty,
    }));

    if (data.items && data.items.length > 0) {
      if (wasAlreadyDone) {
        return c.json(
          {
            success: false,
            message: "Cannot modify line items of an applied adjustment.",
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

        const existingLevel = await db.query.stockLevels.findFirst({
          where: and(
            eq(stockLevels.productId, prod.id),
            eq(stockLevels.locationId, newLocationId)
          ),
        });

        const currentRecorded = existingLevel?.quantity ?? 0;
        let counted = item.countedQty;
        let delta = item.deltaQty ?? item.quantity;

        if (counted !== undefined) {
          delta = counted - currentRecorded;
        } else if (delta !== undefined) {
          counted = currentRecorded + delta;
        } else {
          counted = currentRecorded;
          delta = 0;
        }

        itemsToProcess.push({
          productId: prod.id,
          recordedQty: currentRecorded,
          countedQty: counted,
          deltaQty: delta,
        });
      }
    }

    // 4. Atomic Transaction for applying adjustments
    await db.transaction(async (tx) => {
      // Update line items if provided and wasn't already done
      if (data.items && data.items.length > 0 && !wasAlreadyDone) {
        await tx
          .delete(adjustmentLines)
          .where(eq(adjustmentLines.adjustmentId, existing.id));

        for (const item of itemsToProcess) {
          await tx.insert(adjustmentLines).values({
            adjustmentId: existing.id,
            productId: item.productId,
            recordedQty: item.recordedQty,
            countedQty: item.countedQty,
            deltaQty: item.deltaQty,
            createdAt: now,
          });
        }
      }

      // If transitioning from non-done to done, apply delta to stock levels & ledger
      if (!wasAlreadyDone && isNowDone) {
        for (const item of itemsToProcess) {
          if (item.deltaQty !== 0) {
            await executeStockMovement(tx, {
              productId: item.productId,
              locationId: newLocationId,
              deltaQty: item.deltaQty,
              sourceType: "adjustment",
              sourceId: existing.id,
              notes: `Adjustment: ${data.reason?.trim() || existing.reason} (${existing.adjustmentNumber})`,
              userId,
              allowNegative: false,
            });
          }
        }
      }

      // Update adjustment record
      await tx
        .update(adjustments)
        .set({
          locationId: newLocationId,
          reason: data.reason ? data.reason.trim() : existing.reason,
          status: data.status || existing.status,
          notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : existing.notes,
          appliedAt: !wasAlreadyDone && isNowDone ? now : existing.appliedAt,
          appliedBy: !wasAlreadyDone && isNowDone ? userId : existing.appliedBy,
          updatedAt: now,
        })
        .where(eq(adjustments.id, existing.id));
    });

    // 5. Fetch updated adjustment
    const updated = await db.query.adjustments.findFirst({
      where: eq(adjustments.id, existing.id),
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

    return c.json({
      success: true,
      message: isNowDone && !wasAlreadyDone
        ? `Stock adjustment ${existing.adjustmentNumber} applied and stock levels updated successfully.`
        : `Stock adjustment ${existing.adjustmentNumber} updated successfully.`,
      data: formatAdjustmentResponse(updated),
    });
  } catch (error: any) {
    console.error("Error updating stock adjustment:", error);
    const isInsufficient = error.name === "InsufficientStockError";
    return c.json(
      {
        success: false,
        message: error.message || "Failed to update stock adjustment",
      },
      isInsufficient ? 400 : 500
    );
  }
}
