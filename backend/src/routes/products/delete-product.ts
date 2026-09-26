import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { receiptLines } from "../../db/schema/receipts.schema";
import { deliveryLines } from "../../db/schema/deliveries.schema";
import { transferLines } from "../../db/schema/transfers.schema";
import { adjustmentLines } from "../../db/schema/adjustments.schema";
import { stockLedger } from "../../db/schema/ledger.schema";

/**
 * DELETE /api/v1/products/:id
 * Remove or deactivate a product item safely without violating ledger integrity.
 */
export async function deleteProductHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();
    if (!id) {
      return c.json({ success: false, message: "Product identifier is required" }, 400);
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    const existing = await db.query.products.findFirst({
      where: isUuid
        ? eq(products.id, id)
        : eq(products.sku, id.toUpperCase()),
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "Product not found",
        },
        404
      );
    }

    const productId = existing.id;

    // Check if referenced in immutable ledger first (fastest single lookup)
    const hasLedger = await db.query.stockLedger.findFirst({
      where: eq(stockLedger.productId, productId),
    });

    let isReferenced = !!hasLedger;

    if (!isReferenced) {
      // Check operational lines sequentially if no ledger entry
      const hasReceipts = await db.query.receiptLines.findFirst({
        where: eq(receiptLines.productId, id),
      });
      const hasDeliveries = !hasReceipts && (await db.query.deliveryLines.findFirst({
        where: eq(deliveryLines.productId, id),
      }));
      const hasTransfers = !hasReceipts && !hasDeliveries && (await db.query.transferLines.findFirst({
        where: eq(transferLines.productId, id),
      }));
      const hasAdjustments = !hasReceipts && !hasDeliveries && !hasTransfers && (await db.query.adjustmentLines.findFirst({
        where: eq(adjustmentLines.productId, id),
      }));

      isReferenced = !!(hasReceipts || hasDeliveries || hasTransfers || hasAdjustments);
    }

    if (isReferenced) {
      // Soft-delete to preserve audit and ledger integrity
      await db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id));

      return c.json({
        success: true,
        message:
          "Product has transaction history and was deactivated instead of deleted to protect ledger integrity",
        deactivated: true,
      });
    }

    // Unreferenced product can be safely deleted
    await db.delete(products).where(eq(products.id, id));

    return c.json({
      success: true,
      message: "Product deleted successfully",
      deleted: true,
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json(
      {
        success: false,
        message: "Failed to delete product",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
