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
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/receipts
 * Create a new incoming stock receipt document.
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

    // 3. Determine status: Creation is always unvalidated (draft/waiting/ready)
    const initialStatus = requestedStatus === "done" ? "ready" : requestedStatus || "draft";
    const receiptNumber = generateReceiptNumber();

    const expectedDateObj = scheduledDate || expectedDate ? new Date((scheduledDate || expectedDate)!) : new Date();

    // 4. Create receipt & lines in atomic transaction (no stock movement on create)
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
          validatedAt: null,
          validatedBy: null,
        })
        .returning();

      if (!insertedReceipt) {
        throw new Error("Failed to insert receipt header");
      }

      // Insert line items (qtyReceived is 0 until received & validated)
      for (const item of items) {
        const qty = item.quantity ?? item.qtyExpected ?? 1;

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
          qtyReceived: 0,
        });
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
        message: `Receipt ${receiptNumber} created in status '${initialStatus}'. Stock will be incremented once validation is completed.`,
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
