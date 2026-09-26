import { Hono } from "hono";
import { getAdjustmentsHandler } from "./get-adjustments";
import { getAdjustmentByIdHandler } from "./get-adjustment-by-id";
import { createAdjustmentHandler } from "./create-adjustment";
import { updateAdjustmentHandler } from "./update-adjustment";

const adjustmentsRouter = new Hono();

// GET / - List all adjustments
adjustmentsRouter.get("/", getAdjustmentsHandler);

// POST / - Create new adjustment
adjustmentsRouter.post("/", createAdjustmentHandler);

// GET /:id - Single adjustment by ID or Adjustment Number
adjustmentsRouter.get("/:id", getAdjustmentByIdHandler);

// PUT /:id & PATCH /:id - Update adjustment or apply to ledger
adjustmentsRouter.put("/:id", updateAdjustmentHandler);
adjustmentsRouter.patch("/:id", updateAdjustmentHandler);

export { adjustmentsRouter };
export * from "./adjustment.schema";
export * from "./adjustment.helper";
export * from "./get-adjustments";
export * from "./get-adjustment-by-id";
export * from "./create-adjustment";
export * from "./update-adjustment";
