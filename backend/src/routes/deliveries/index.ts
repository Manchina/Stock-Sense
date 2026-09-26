import { Hono } from "hono";
import { getDeliveriesHandler } from "./get-deliveries";
import { getDeliveryByIdHandler } from "./get-delivery-by-id";
import { createDeliveryHandler } from "./create-delivery";
import { validateDeliveryHandler } from "./validate-delivery";
import { cancelDeliveryHandler } from "./cancel-delivery";
import { updateDeliveryHandler } from "./update-delivery";

import { authMiddleware } from "../../middleware/auth.middleware";

const deliveriesRouter = new Hono();

// GET / - List all deliveries with search & status filters
deliveriesRouter.get("/", getDeliveriesHandler);

// GET /:id - Get single delivery by UUID or order number
deliveriesRouter.get("/:id", getDeliveryByIdHandler);

// Protected mutation routes (requires valid authentication token)
deliveriesRouter.post("/", authMiddleware, createDeliveryHandler);
deliveriesRouter.post("/:id/validate", authMiddleware, validateDeliveryHandler);
deliveriesRouter.post("/:id/cancel", authMiddleware, cancelDeliveryHandler);
deliveriesRouter.put("/:id", authMiddleware, updateDeliveryHandler);
deliveriesRouter.patch("/:id", authMiddleware, updateDeliveryHandler);

export { deliveriesRouter };
export * from "./delivery.schema";
export * from "./delivery.helper";
export * from "./get-deliveries";
export * from "./get-delivery-by-id";
export * from "./create-delivery";
export * from "./validate-delivery";
export * from "./cancel-delivery";
export * from "./update-delivery";
