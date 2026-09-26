import { Context } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders } from "../../db/schema/deliveries.schema";
import { formatDeliveryResponse } from "./delivery.helper";

/**
 * POST /api/v1/deliveries/:id/cancel
 * Cancel an active draft/waiting/ready delivery order.
 */
export async function cancelDeliveryHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Delivery ID is required" }, 400);
    }

    const [canceledDelivery] = await db
      .update(deliveryOrders)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(deliveryOrders.id, id),
          ne(deliveryOrders.status, "done"),
          ne(deliveryOrders.status, "canceled")
        )
      )
      .returning();

    if (!canceledDelivery) {
      const existing = await db.query.deliveryOrders.findFirst({
        where: eq(deliveryOrders.id, id),
      });

      if (!existing) {
        return c.json({ success: false, message: `Delivery order with ID '${id}' not found` }, 404);
      }

      if (existing.status === "done") {
        return c.json(
          {
            success: false,
            message: "Cannot cancel a delivery that has already been validated and dispatched.",
          },
          400
        );
      }

      return c.json({ success: false, message: "Delivery order is already canceled." }, 400);
    }

    const updated = await db.query.deliveryOrders.findFirst({
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

    if (!updated) {
      throw new Error("Failed to load canceled delivery order");
    }

    return c.json({
      success: true,
      message: `Delivery order '${updated.orderNumber}' canceled successfully`,
      data: formatDeliveryResponse(updated),
    });
  } catch (error) {
    console.error("Error canceling delivery order:", error);
    return c.json(
      {
        success: false,
        message: "Failed to cancel delivery order",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
