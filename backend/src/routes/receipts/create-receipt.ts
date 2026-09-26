import { Context } from "hono";
import { db } from "../../config/db";
import { receipts, receiptLines } from "../../db/schema/receipts.schema";
import { products } from "../../db/schema/products.schema";
import { createReceiptSchema } from "./receipt.schema";
import {
  generateReceiptNumber,
  resolveDestinationFacility,
  resolveDefaultUserId,
  formatReceiptResponse,
} from "./receipt.helper";
import { executeStockMovement } from "../../services/stock.service";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/receipts
 * Create a new incoming stock receipt document.
 * If validateImmediately is true (or status is 'done'), automatically records stock ledger movements.
 */
export async function createReceiptHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createReceiptSchema.safeParse(body);

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

    const {
      supplierName: inputSupplier,
      partner: inputPartner,
      destinationWarehouseId,
      destinationLocationId,
      destinationWarehouse,
      destinationLocation,
      status: requestedStatus,
      validateImmediately,
      expectedDate,
      scheduledDate,
      notes,
      items,
    } = parsed.data;

    const supplierName = (inputSupplier || inputPartner || "Direct Supplier").trim();

    // 1. Resolve facility
    const facility = await resolveDestinationFacility({
      destinationWarehouseId,
      destinationLocationId,
      destinationWarehouse,
      destinationLocation,
    });

    // 2. Resolve creator user
    const currentUser = c.get("user") as { id: string; name?: string } | undefined;
    const userId = await resolveDefaultUserId(currentUser?.id);

    // 3. Determine status
    const shouldValidate = validateImmediately || requestedStatus === "done";
    const initialStatus = shouldValidate ? "done" : requestedStatus || "draft";
    const receiptNumber = generateReceiptNumber();

    const expectedDateObj = scheduledDate || expectedDate ? new Date((scheduledDate || expectedDate)!) : new Date();

    // 4. Create receipt & lines in atomic transaction
    const createdReceipt = await db.transaction(async (tx) => {
      const [insertedReceipt] = await tx
        .insert(receipts)
        .values({
          receiptNumber,
          supplierName,
          destinationWarehouseId: facility.warehouseId,
          destinationLocationId: facility.locationId,
          status: initialStatus,
          notes: notes?.trim() || null,
          expectedDate: expectedDateObj,
          createdBy: userId,
          validatedAt: shouldValidate ? new Date() : null,
          validatedBy: shouldValidate ? userId : null,
        })
        .returning();

      if (!insertedReceipt) {
        throw new Error("Failed to insert receipt header");
      }

      // Insert line items
      for (const item of items) {
        const qty = item.quantity ?? item.qtyExpected ?? 1;
        const qtyRcv = shouldValidate ? item.qtyReceived ?? qty : item.qtyReceived ?? 0;

        // Verify product exists
        const prod = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!prod) {
          throw new Error(`Product with ID '${item.productId}' not found`);
        }

        await tx.insert(receiptLines).values({
          receiptId: insertedReceipt.id,
          productId: item.productId,
          qtyExpected: qty,
          qtyReceived: qtyRcv,
        });

        // If validated immediately, execute stock movement (+In) into stock ledger
        if (shouldValidate && facility.locationId) {
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: facility.locationId,
            deltaQty: qtyRcv > 0 ? qtyRcv : qty,
            sourceType: "receipt",
            sourceId: insertedReceipt.id,
            notes: `Receipt ${receiptNumber} from ${supplierName}`,
            userId,
          });
        }
      }

      return insertedReceipt;
    });

    // 5. Fetch fresh receipt with full relations
    const fullReceipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, createdReceipt.id),
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

    if (!fullReceipt) {
      throw new Error("Failed to load newly created receipt");
    }

    return c.json(
      {
        success: true,
        message: shouldValidate
          ? `Receipt ${receiptNumber} created and validated (+stock incremented in ledger)`
          : `Receipt ${receiptNumber} created in status '${initialStatus}'`,
        data: formatReceiptResponse(fullReceipt),
      },
      201
    );
  } catch (error) {
    console.error("Error creating receipt:", error);
    return c.json(
      {
        success: false,
        message: "Failed to create receipt",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
