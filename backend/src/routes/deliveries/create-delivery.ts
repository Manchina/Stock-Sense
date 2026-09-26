import { Context } from "hono";
import { db } from "../../config/db";
import { deliveryOrders, deliveryLines } from "../../db/schema/deliveries.schema";
import { products } from "../../db/schema/products.schema";
import { createDeliverySchema } from "./delivery.schema";
import {
  generateDeliveryNumber,
  resolveSourceFacility,
  resolveDefaultUserId,
  formatDeliveryResponse,
} from "./delivery.helper";
import { eq } from "drizzle-orm";

import { executeStockMovement } from "../../services/stock.service";

/**
 * POST /api/v1/deliveries
 * Create a new outbound delivery order document.
 */
export async function createDeliveryHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createDeliverySchema.safeParse(body);

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
      customerName: inputCustomer,
      partner: inputPartner,
      customerRef,
      sourceWarehouseId,
      sourceLocationId,
      sourceWarehouse,
      sourceLocation,
      status: requestedStatus,
      validateImmediately,
      notes,
      items,
    } = parsed.data;

    const customerName = (inputCustomer || inputPartner || "Direct Customer").trim();

    // 1. Resolve source facility
    const facility = await resolveSourceFacility({
      sourceWarehouseId,
      sourceLocationId,
      sourceWarehouse,
      sourceLocation,
    });

    // 2. Resolve creator user
    const currentUser = c.get("user") as { id: string; name?: string } | undefined;
    const userId = await resolveDefaultUserId(currentUser?.id);

    // 3. Determine status & validation
    const shouldValidate = validateImmediately || requestedStatus === "done";
    const initialStatus = shouldValidate ? "done" : requestedStatus || "draft";
    const orderNumber = generateDeliveryNumber();

    // 4. Create delivery order & lines in atomic transaction
    const createdDelivery = await db.transaction(async (tx) => {
      const [insertedDelivery] = await tx
        .insert(deliveryOrders)
        .values({
          orderNumber,
          customerName,
          customerRef: customerRef?.trim() || null,
          sourceWarehouseId: facility.warehouseId,
          sourceLocationId: facility.locationId,
          status: initialStatus,
          notes: notes?.trim() || null,
          createdBy: userId,
          validatedAt: shouldValidate ? new Date() : null,
          validatedBy: shouldValidate ? userId : null,
        })
        .returning();

      if (!insertedDelivery) {
        throw new Error("Failed to insert delivery order header");
      }

      for (const item of items) {
        const qtyOrdered = item.quantity ?? item.qtyOrdered ?? 1;
        const qtyPicked = shouldValidate || initialStatus === "ready" ? qtyOrdered : (item.qtyPicked ?? 0);
        const qtyDelivered = shouldValidate ? qtyOrdered : 0;

        // Verify product exists
        const prod = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });

        if (!prod) {
          throw new Error(`Product with ID '${item.productId}' not found`);
        }

        await tx.insert(deliveryLines).values({
          deliveryId: insertedDelivery.id,
          productId: item.productId,
          qtyOrdered,
          qtyPicked,
          qtyDelivered,
        });

        // Deduct stock if immediate validation is requested
        if (shouldValidate && facility.locationId) {
          await executeStockMovement(tx, {
            productId: item.productId,
            locationId: facility.locationId,
            deltaQty: -qtyDelivered,
            sourceType: "delivery",
            sourceId: insertedDelivery.id,
            notes: `Delivery ${orderNumber} to ${customerName}`,
            userId,
          });
        }
      }

      return insertedDelivery;
    });

    // 5. Fetch fresh delivery with full relations
    const fullDelivery = await db.query.deliveryOrders.findFirst({
      where: eq(deliveryOrders.id, createdDelivery.id),
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

    if (!fullDelivery) {
      throw new Error("Failed to load newly created delivery order");
    }

    return c.json(
      {
        success: true,
        message: `Delivery order ${orderNumber} created in status '${initialStatus}'. Stock will be deducted once validation is completed.`,
        data: formatDeliveryResponse(fullDelivery),
      },
      201
    );
  } catch (error) {
    console.error("Error creating delivery order:", error);
    return c.json(
      {
        success: false,
        message: "Failed to create delivery order",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
