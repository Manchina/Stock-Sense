import { Hono } from "hono";
import { getReceiptsHandler } from "./get-receipts";
import { getReceiptByIdHandler } from "./get-receipt-by-id";
import { createReceiptHandler } from "./create-receipt";
import { validateReceiptHandler } from "./validate-receipt";
import { cancelReceiptHandler } from "./cancel-receipt";
import { updateReceiptHandler } from "./update-receipt";

const receiptsRouter = new Hono();

// GET / - List all receipts with search & status filters
receiptsRouter.get("/", getReceiptsHandler);

// GET /:id - Get single receipt by UUID or receipt number
receiptsRouter.get("/:id", getReceiptByIdHandler);

// POST / - Create new receipt (optionally validate immediately)
receiptsRouter.post("/", createReceiptHandler);

// POST /:id/validate - Validate receipt, credit stock levels, and write to stock ledger
receiptsRouter.post("/:id/validate", validateReceiptHandler);

// POST /:id/cancel - Cancel receipt
receiptsRouter.post("/:id/cancel", cancelReceiptHandler);

// PUT /:id & PATCH /:id - Update receipt details
receiptsRouter.put("/:id", updateReceiptHandler);
receiptsRouter.patch("/:id", updateReceiptHandler);

export { receiptsRouter };
export * from "./receipt.schema";
export * from "./receipt.helper";
export * from "./get-receipts";
export * from "./get-receipt-by-id";
export * from "./create-receipt";
export * from "./validate-receipt";
export * from "./cancel-receipt";
export * from "./update-receipt";
