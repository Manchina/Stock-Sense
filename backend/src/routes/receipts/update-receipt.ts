import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts, receiptLines } from "../../db/schema/receipts.schema";
import { products } from "../../db/schema/products.schema";
import { updateReceiptSchema } from "./receipt.schema";
import { resolveDestinationFacility, formatReceiptResponse } from "./receipt.helper";

/**
 * PUT /api/v1/receipts/:id & PATCH /api/v1/receipts/:id
 * Update an existing receipt (e.g. change notes, expected date, supplier, line items).
 */
export async function updateReceiptHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Receipt ID is required" }, 400);
    }

    const body = await c.req.json();
    const parsed = updateReceiptSchema.safeParse(body);

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

    const existing = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
      with: { lines: true },
    });

    if (!existing) {
      return c.json({ success: false, message: `Receipt with ID '${id}' not found` }, 404);
    }

    if (existing.status === "done") {
      return c.json(
        {
          success: false,
          message: "Cannot modify a validated receipt.",
        },
        400
      );
    }

    const {
      supplierName: inputSupplier,
      partner: inputPartner,
      destinationWarehouseId,
      destinationLocationId,
      destinationLocation,
      status: newStatus,
      expectedDate,
      scheduledDate,
      notes,
      items,
    } = parsed.data;

    const supplierName = inputSupplier || inputPartner;

    await db.transaction(async (tx) => {
      // 1. Update header fields
      const updateData: Partial<typeof receipts.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (supplierName !== undefined) updateData.supplierName = supplierName.trim();
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      if (newStatus !== undefined) updateData.status = newStatus;
      if (expectedDate !== undefined || scheduledDate !== undefined) {
        const d = scheduledDate || expectedDate;
        updateData.expectedDate = d ? new Date(d) : null;
      }

      if (destinationWarehouseId || destinationLocationId || destinationLocation) {
        const facility = await resolveDestinationFacility({
          destinationWarehouseId,
          destinationLocationId,
          destinationLocation,
        });
        updateData.destinationWarehouseId = facility.warehouseId;
        updateData.destinationLocationId = facility.locationId;
      }

      await tx.update(receipts).set(updateData).where(eq(receipts.id, id));

      // 2. Synchronize line items if provided
      if (items !== undefined) {
        await tx.delete(receiptLines).where(eq(receiptLines.receiptId, id));

        for (const item of items) {
          const qty = item.quantity ?? item.qtyExpected ?? 1;
          const qtyRcv = item.qtyReceived ?? 0;

          const prod = await tx.query.products.findFirst({
            where: eq(products.id, item.productId),
          });

          if (!prod) {
            throw new Error(`Product with ID '${item.productId}' not found`);
          }

          await tx.insert(receiptLines).values({
            receiptId: id,
            productId: item.productId,
            qtyExpected: qty,
            qtyReceived: qtyRcv,
          });
        }
      }
    });

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
      throw new Error("Failed to load updated receipt");
    }

    return c.json({
      success: true,
      message: `Receipt '${updated.receiptNumber}' updated successfully`,
      data: formatReceiptResponse(updated),
    });
  } catch (error) {
    console.error("Error updating receipt:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update receipt",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
