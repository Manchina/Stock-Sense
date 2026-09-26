import { Hono } from "hono";
import { getReceiptsHandler } from "./get-receipts";
import { getReceiptByIdHandler } from "./get-receipt-by-id";
import { createReceiptHandler } from "./create-receipt";
import { validateReceiptHandler } from "./validate-receipt";
import { cancelReceiptHandler } from "./cancel-receipt";
import { updateReceiptHandler } from "./update-receipt";

import { authMiddleware } from "../../middleware/auth.middleware";

const receiptsRouter = new Hono();

// GET / - List all receipts with search & status filters
receiptsRouter.get("/", getReceiptsHandler);

// GET /:id - Get single receipt by UUID or receipt number
receiptsRouter.get("/:id", getReceiptByIdHandler);

// Protected mutation routes (requires valid authentication token)
receiptsRouter.post("/", authMiddleware, createReceiptHandler);
receiptsRouter.post("/:id/validate", authMiddleware, validateReceiptHandler);
receiptsRouter.post("/:id/cancel", authMiddleware, cancelReceiptHandler);
receiptsRouter.put("/:id", authMiddleware, updateReceiptHandler);
receiptsRouter.patch("/:id", authMiddleware, updateReceiptHandler);

export { receiptsRouter };
export * from "./receipt.schema";
export * from "./receipt.helper";
export * from "./get-receipts";
export * from "./get-receipt-by-id";
export * from "./create-receipt";
export * from "./validate-receipt";
export * from "./cancel-receipt";
export * from "./update-receipt";
