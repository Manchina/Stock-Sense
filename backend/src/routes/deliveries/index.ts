import { Hono } from "hono";
import { getDeliveriesHandler } from "./get-deliveries";
import { getDeliveryByIdHandler } from "./get-delivery-by-id";
import { createDeliveryHandler } from "./create-delivery";
import { validateDeliveryHandler } from "./validate-delivery";
import { cancelDeliveryHandler } from "./cancel-delivery";
import { updateDeliveryHandler } from "./update-delivery";

const deliveriesRouter = new Hono();

// GET / - List all deliveries with search & status filters
deliveriesRouter.get("/", getDeliveriesHandler);

// GET /:id - Get single delivery by UUID or order number
deliveriesRouter.get("/:id", getDeliveryByIdHandler);

// POST / - Create new delivery order (optionally validate immediately)
deliveriesRouter.post("/", createDeliveryHandler);

// POST /:id/validate - Validate delivery, decrement stock levels, and write to stock ledger
deliveriesRouter.post("/:id/validate", validateDeliveryHandler);

// POST /:id/cancel - Cancel delivery
deliveriesRouter.post("/:id/cancel", cancelDeliveryHandler);

// PUT /:id & PATCH /:id - Update delivery details
deliveriesRouter.put("/:id", updateDeliveryHandler);
deliveriesRouter.patch("/:id", updateDeliveryHandler);

export { deliveriesRouter };
export * from "./delivery.schema";
export * from "./delivery.helper";
export * from "./get-deliveries";
export * from "./get-delivery-by-id";
export * from "./create-delivery";
export * from "./validate-delivery";
export * from "./cancel-delivery";
export * from "./update-delivery";
