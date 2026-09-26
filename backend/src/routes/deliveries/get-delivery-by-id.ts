import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders } from "../../db/schema/deliveries.schema";
import { formatDeliveryResponse, isUuid } from "./delivery.helper";

/**
 * GET /api/v1/deliveries/:id
 * Fetch a single delivery order by UUID or orderNumber.
 */
export async function getDeliveryByIdHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();

    if (!id) {
      return c.json({ success: false, message: "Delivery ID or Order Number is required" }, 400);
    }

    const conditions = [eq(deliveryOrders.orderNumber, id)];
    if (isUuid(id)) {
      conditions.push(eq(deliveryOrders.id, id));
    }

    const delivery = await db.query.deliveryOrders.findFirst({
      where: or(...conditions),
      with: {
        sourceWarehouse: true,
        sourceLocation: {
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

    if (!delivery) {
      return c.json(
        {
          success: false,
          message: `Delivery order '${id}' not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: formatDeliveryResponse(delivery),
    });
  } catch (error) {
    console.error("Error fetching delivery by ID:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve delivery order",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
