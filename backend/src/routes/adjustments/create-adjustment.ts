import { Context } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { adjustments, adjustmentLines } from "../../db/schema/adjustments.schema";
import { stockLevels } from "../../db/schema/stock-levels.schema";
import { createAdjustmentSchema } from "./adjustment.schema";
import {
  resolveLocation,
  resolveProduct,
  resolveUserId,
  generateAdjustmentNumber,
  formatAdjustmentResponse,
} from "./adjustment.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * POST /api/v1/adjustments
 * Create a new stock adjustment.
 * If status is 'done', stock level reconciliation movements are executed immediately.
 */
export async function createAdjustmentHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createAdjustmentSchema.safeParse(body);

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

    // 1. Resolve target location
    const targetLoc = await resolveLocation(
      data.locationId,
      data.location || data.sourceLocation
    );

    if (!targetLoc) {
      return c.json(
        {
          success: false,
          message: "Could not resolve valid adjustment location.",
        },
        400
      );
    }

    // 2. Resolve items, query current system recorded stock, and compute deltas
    const resolvedItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      recordedQty: number;
      countedQty: number;
      deltaQty: number;
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

      // Query current stock level for this product & location
      const existingLevel = await db.query.stockLevels.findFirst({
        where: and(
          eq(stockLevels.productId, prod.id),
          eq(stockLevels.locationId, targetLoc.id)
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

      if (counted < 0) {
        return c.json(
          {
            success: false,
            message: `Physical count for product '${prod.name}' cannot result in negative stock.`,
          },
          400
        );
      }

      resolvedItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        recordedQty: currentRecorded,
        countedQty: counted,
        deltaQty: delta,
      });
    }

    // 3. Resolve user operator
    const userId = await resolveUserId(data.userId);
    const adjustmentNumber =
      data.adjustmentNumber ||
      data.documentNumber ||
      (await generateAdjustmentNumber());

    const isDone = data.status === "done";
    const now = new Date();

    // 4. Atomic transaction
    const createdAdjustmentId = await db.transaction(async (tx) => {
      const [insertedAdjustment] = await tx
        .insert(adjustments)
        .values({
          adjustmentNumber,
          locationId: targetLoc.id,
          reason: data.reason.trim(),
          status: data.status,
          notes: data.notes?.trim() || data.reason.trim(),
          appliedAt: isDone ? now : null,
          appliedBy: isDone ? userId : null,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!insertedAdjustment) {
        throw new Error("Failed to insert adjustment header");
      }

      // Insert line items & execute stock movement if done
      for (const item of resolvedItems) {
        await tx.insert(adjustmentLines).values({
          adjustmentId: insertedAdjustment.id,
          productId: item.productId,
          recordedQty: item.recordedQty,
          countedQty: item.countedQty,
          deltaQty: item.deltaQty,
          createdAt: now,
        });

        if (isDone && item.deltaQty !== 0) {
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: targetLoc.id,
            deltaQty: item.deltaQty,
            sourceType: "adjustment",
            sourceId: insertedAdjustment.id,
            notes: `Adjustment: ${data.reason.trim()} (${adjustmentNumber})`,
            userId,
            allowNegative: false,
          });
        }
      }

      return insertedAdjustment.id;
    });

    // 5. Fetch full created adjustment
    const fullAdjustment = await db.query.adjustments.findFirst({
      where: (a, { eq }) => eq(a.id, createdAdjustmentId),
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

    return c.json(
      {
        success: true,
        message: isDone
          ? `Stock adjustment ${adjustmentNumber} applied and ledger updated successfully.`
          : `Stock adjustment ${adjustmentNumber} saved as ${data.status}.`,
        data: formatAdjustmentResponse(fullAdjustment),
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating stock adjustment:", error);
    const isInsufficient = error.name === "InsufficientStockError";
    return c.json(
      {
        success: false,
        message: error.message || "Failed to create stock adjustment",
      },
      isInsufficient ? 400 : 500
    );
  }
}
