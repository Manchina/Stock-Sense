import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { deliveryOrders, deliveryLines } from "../../db/schema/deliveries.schema";
import { products } from "../../db/schema/products.schema";
import { updateDeliverySchema } from "./delivery.schema";
import { resolveSourceFacility, resolveDefaultUserId, formatDeliveryResponse } from "./delivery.helper";
import { executeStockMovement } from "../../services/stock.service";

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

    if (existing.status === "done") {
      return c.json(
        {
          success: false,
          message: "Cannot modify a validated and dispatched delivery order.",
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

    const customerName = inputCustomer || inputPartner;
    const currentUser = c.get("user") as { id: string } | undefined;
    const userId = await resolveDefaultUserId(currentUser?.id);

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
        if (newStatus === "done") {
          updateData.validatedAt = new Date();
          updateData.validatedBy = userId;
        }
      }

      let activeLocationId = existing.sourceLocationId;
      if (sourceWarehouseId || sourceLocationId || sourceLocation) {
        const facility = await resolveSourceFacility({
          sourceWarehouseId,
          sourceLocationId,
          sourceLocation,
        });
        updateData.sourceWarehouseId = facility.warehouseId;
        updateData.sourceLocationId = facility.locationId;
        activeLocationId = facility.locationId;
      }

      await tx.update(deliveryOrders).set(updateData).where(eq(deliveryOrders.id, id));

      // 2. Synchronize line items if provided
      if (items !== undefined && items.length > 0) {
        await tx.delete(deliveryLines).where(eq(deliveryLines.deliveryId, id));

        for (const item of items) {
          const qtyOrdered = item.quantity ?? item.qtyOrdered ?? 1;
          const qtyPicked = item.qtyPicked ?? (newStatus === "ready" || newStatus === "done" ? qtyOrdered : 0);
          const qtyDelivered = newStatus === "done" ? (item.qtyDelivered ?? qtyOrdered) : (item.qtyDelivered ?? 0);

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
            qtyDelivered,
          });

          // If transition to done in this update, deduct stock
          if (newStatus === "done" && activeLocationId) {
            const deductQty = qtyDelivered > 0 ? qtyDelivered : qtyOrdered;
            await executeStockMovement(tx, {
              productId: item.productId,
              locationId: activeLocationId,
              deltaQty: -deductQty,
              sourceType: "delivery",
              sourceId: id,
              notes: `Delivery ${existing.orderNumber} to ${customerName || existing.customerName}`,
              userId,
            });
          }
        }
      } else if (newStatus === "done") {
        // If status changed to done without replacing items, deduct based on existing lines
        for (const line of existing.lines) {
          const deductQty = line.qtyDelivered > 0 ? line.qtyDelivered : line.qtyOrdered;
          await tx
            .update(deliveryLines)
            .set({
              qtyPicked: line.qtyPicked > 0 ? line.qtyPicked : deductQty,
              qtyDelivered: deductQty,
            })
            .where(eq(deliveryLines.id, line.id));

          if (activeLocationId) {
            await executeStockMovement(tx, {
              productId: line.productId,
              locationId: activeLocationId,
              deltaQty: -deductQty,
              sourceType: "delivery",
              sourceId: id,
              notes: `Delivery ${existing.orderNumber} to ${existing.customerName}`,
              userId,
            });
          }
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
