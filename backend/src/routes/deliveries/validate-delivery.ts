import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders, deliveryLines } from "../../db/schema/deliveries.schema";
import { locations } from "../../db/schema/warehouses.schema";
import { resolveDefaultUserId, formatDeliveryResponse } from "./delivery.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * POST /api/v1/deliveries/:id/validate
 * Validate a delivery order, decrementing inventory stock levels and writing immutable stock ledger records.
 */
export async function validateDeliveryHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Delivery ID is required" }, 400);
    }

    const existingDelivery = await db.query.deliveryOrders.findFirst({
      where: eq(deliveryOrders.id, id),
      with: {
        sourceWarehouse: true,
        sourceLocation: true,
        lines: {
          with: { product: true },
        },
      },
    });

    if (!existingDelivery) {
      return c.json({ success: false, message: `Delivery order with ID '${id}' not found` }, 404);
    }

    if (existingDelivery.status === "done") {
      return c.json(
        {
          success: false,
          message: `Delivery order '${existingDelivery.orderNumber}' has already been validated and dispatched.`,
        },
        400
      );
    }

    if (existingDelivery.status === "canceled") {
      return c.json(
        {
          success: false,
          message: `Cannot validate canceled delivery order '${existingDelivery.orderNumber}'.`,
        },
        400
      );
    }

    // Ensure we have a source location to deduct from
    let targetLocationId = existingDelivery.sourceLocationId;
    if (!targetLocationId) {
      const firstLoc = await db.query.locations.findFirst({
        where: eq(locations.warehouseId, existingDelivery.sourceWarehouseId),
      });
      targetLocationId = firstLoc?.id || null;
    }

    if (!targetLocationId) {
      return c.json(
        {
          success: false,
          message: "Cannot validate delivery: No warehouse origin location found to withdraw stock from.",
        },
        400
      );
    }

    const currentUser = c.get("user") as { id: string } | undefined;
    const userId = await resolveDefaultUserId(currentUser?.id);

    // Atomic validation & ledger write
    await db.transaction(async (tx) => {
      // 1. Update delivery header
      await tx
        .update(deliveryOrders)
        .set({
          status: "done",
          sourceLocationId: targetLocationId,
          validatedAt: new Date(),
          validatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(deliveryOrders.id, id));

      // 2. Iterate each line item, mark qtyDelivered = qtyOrdered, and execute stock movement (-Out)
      for (const line of existingDelivery.lines) {
        const deliveredQty = line.qtyDelivered > 0 ? line.qtyDelivered : line.qtyOrdered;
        const pickedQty = line.qtyPicked > 0 ? line.qtyPicked : deliveredQty;

        await tx
          .update(deliveryLines)
          .set({
            qtyPicked: pickedQty,
            qtyDelivered: deliveredQty,
          })
          .where(eq(deliveryLines.id, line.id));

        // Decrement stock balance & append to stock ledger (links directly to Move History)
        await executeStockMovement(tx, {
          productId: line.productId,
          locationId: targetLocationId!,
          deltaQty: -deliveredQty,
          sourceType: "delivery",
          sourceId: existingDelivery.id,
          notes: `Delivery ${existingDelivery.orderNumber} to ${existingDelivery.customerName}`,
          userId,
        });
      }
    });

    // 3. Fetch updated delivery
    const updatedDelivery = await db.query.deliveryOrders.findFirst({
      where: eq(deliveryOrders.id, id),
      with: {
        sourceWarehouse: true,
        sourceLocation: {
          with: { warehouse: true },
        },
        creator: true,
        validator: true,
        lines: {
          with: { product: true },
        },
      },
    });

    if (!updatedDelivery) {
      throw new Error("Failed to load validated delivery order");
    }

    return c.json({
      success: true,
      message: `Delivery order '${updatedDelivery.orderNumber}' validated successfully (-stock deducted in ledger)`,
      data: formatDeliveryResponse(updatedDelivery),
    });
  } catch (error) {
    console.error("Error validating delivery order:", error);
    return c.json(
      {
        success: false,
        message: "Failed to validate delivery order",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
