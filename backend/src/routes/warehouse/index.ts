import { Hono } from "hono";
import { getWarehousesHandler } from "./get-warehouses";
import { getWarehouseByIdHandler } from "./get-warehouse-by-id";
import { createWarehouseHandler } from "./create-warehouse";
import { updateWarehouseHandler } from "./update-warehouse";

const warehouseRouter = new Hono();

// GET / - List all warehouses with optional filters
warehouseRouter.get("/", getWarehousesHandler);

// GET /:id - Get single warehouse by UUID or Code
warehouseRouter.get("/:id", getWarehouseByIdHandler);

// POST / - Create a new warehouse
warehouseRouter.post("/", createWarehouseHandler);

// PUT /:id & PATCH /:id - Update warehouse details and locations
warehouseRouter.put("/:id", updateWarehouseHandler);
warehouseRouter.patch("/:id", updateWarehouseHandler);

export { warehouseRouter };
export * from "./warehouse.schema";
export * from "./get-warehouses";
export * from "./get-warehouse-by-id";
export * from "./create-warehouse";
export * from "./update-warehouse";
