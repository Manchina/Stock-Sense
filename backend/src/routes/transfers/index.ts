import { Hono } from "hono";
import { getTransfersHandler } from "./get-transfers";
import { getTransferByIdHandler } from "./get-transfer-by-id";
import { createTransferHandler } from "./create-transfer";
import { updateTransferHandler } from "./update-transfer";

const transfersRouter = new Hono();

// GET / - List all transfers with filters
transfersRouter.get("/", getTransfersHandler);

// POST / - Create new transfer
transfersRouter.post("/", createTransferHandler);

// GET /:id - Single transfer by ID or Transfer Number
transfersRouter.get("/:id", getTransferByIdHandler);

// PUT /:id & PATCH /:id - Update transfer or advance status to done
transfersRouter.put("/:id", updateTransferHandler);
transfersRouter.patch("/:id", updateTransferHandler);

export { transfersRouter };
export * from "./transfer.schema";
export * from "./transfer.helper";
export * from "./get-transfers";
export * from "./get-transfer-by-id";
export * from "./create-transfer";
export * from "./update-transfer";
