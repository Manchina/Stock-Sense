import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders, deliveryLines } from "../../db/schema/deliveries.schema";
import { products } from "../../db/schema/products.schema";
import { updateDeliverySchema } from "./delivery.schema";
import { resolveSourceFacility, formatDeliveryResponse } from "./delivery.helper";

/**
 * PUT /api/v1/deliveries/:id & PATCH /api/v1/deliveries/:id
 * Update an existing delivery order (e.g. advance workflow status, change customer, update line items).
 */
export async function updateDeliveryHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json({ success: false, message: "Delivery ID is required" }, 400);
    }

    const body = await c.req.json();
    const parsed = updateDeliverySchema.safeParse(body);

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

    const existing = await db.query.deliveryOrders.findFirst({
      where: eq(deliveryOrders.id, id),
      with: { lines: true },
    });

    if (!existing) {
      return c.json({ success: false, message: `Delivery order with ID '${id}' not found` }, 404);
    }

    if (existing.status === "done" || existing.status === "canceled") {
      return c.json(
        {
          success: false,
          message:
            existing.status === "done"
              ? "Cannot modify a validated and dispatched delivery order."
              : "Cannot modify a canceled delivery order.",
        },
        400
      );
    }

    const {
      customerName: inputCustomer,
      partner: inputPartner,
      customerRef,
      sourceWarehouseId,
      sourceLocationId,
      sourceLocation,
      status: newStatus,
      notes,
      items,
    } = parsed.data;

    if (newStatus === "done") {
      return c.json(
        {
          success: false,
          message:
            "Direct completion via update is not permitted. Please use POST /api/v1/deliveries/:id/validate to validate and dispatch stock atomically.",
        },
        400
      );
    }

    if (newStatus === "canceled") {
      return c.json(
        {
          success: false,
          message:
            "Direct cancellation via update is not permitted. Please use POST /api/v1/deliveries/:id/cancel.",
        },
        400
      );
    }

    if (items !== undefined && items.length === 0) {
      return c.json(
        {
          success: false,
          message: "Delivery order must contain at least one line item.",
        },
        400
      );
    }

    const customerName = inputCustomer || inputPartner;

    await db.transaction(async (tx) => {
      // 1. Update header fields
      const updateData: Partial<typeof deliveryOrders.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (customerName !== undefined) updateData.customerName = customerName.trim();
      if (customerRef !== undefined) updateData.customerRef = customerRef?.trim() || null;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      if (newStatus !== undefined) {
        updateData.status = newStatus;
      }

      if (sourceWarehouseId || sourceLocationId || sourceLocation) {
        const facility = await resolveSourceFacility({
          sourceWarehouseId,
          sourceLocationId,
          sourceLocation,
        });
        updateData.sourceWarehouseId = facility.warehouseId;
        updateData.sourceLocationId = facility.locationId;
      }

      await tx.update(deliveryOrders).set(updateData).where(eq(deliveryOrders.id, id));

      // 2. Synchronize line items if provided
      if (items !== undefined && items.length > 0) {
        await tx.delete(deliveryLines).where(eq(deliveryLines.deliveryId, id));

        for (const item of items) {
          const qtyOrdered = item.quantity ?? item.qtyOrdered ?? 1;
          const qtyPicked = item.qtyPicked ?? (newStatus === "ready" ? qtyOrdered : 0);

          const prod = await tx.query.products.findFirst({
            where: eq(products.id, item.productId),
          });

          if (!prod) {
            throw new Error(`Product with ID '${item.productId}' not found`);
          }

          await tx.insert(deliveryLines).values({
            deliveryId: id,
            productId: item.productId,
            qtyOrdered,
            qtyPicked,
            qtyDelivered: 0,
          });
        }
      }
    });

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
      throw new Error("Failed to load updated delivery order");
    }

    return c.json({
      success: true,
      message: `Delivery order '${updated.orderNumber}' updated successfully`,
      data: formatDeliveryResponse(updated),
    });
  } catch (error) {
    console.error("Error updating delivery order:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update delivery order",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
