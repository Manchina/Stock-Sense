import { z } from "zod";

export const adjustmentItemSchema = z.object({
  productId: z.string().min(1, "Product ID or name is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  recordedQty: z.coerce.number().int().optional(),
  countedQty: z.coerce.number().int().min(0, "Counted quantity cannot be negative").optional(),
  deltaQty: z.coerce.number().int().optional(),
  quantity: z.coerce.number().int().optional(), // Frontend alias for delta
  unitOfMeasure: z.string().optional(),
});

export const createAdjustmentSchema = z.object({
  adjustmentNumber: z.string().max(100).optional(),
  documentNumber: z.string().max(100).optional(), // Frontend alias
  locationId: z.string().optional().nullable(),
  location: z.string().optional().nullable(), // Frontend location string e.g. "WH-MAIN / Rack A"
  sourceLocation: z.string().optional().nullable(), // Alias
  reason: z.string().min(1, "Reason is required").max(255).default("Physical Count Reconciliation"),
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).default("draft"),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(adjustmentItemSchema).min(1, "At least one product item is required"),
  userId: z.string().optional().nullable(),
});

export const updateAdjustmentSchema = z.object({
  locationId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  reason: z.string().min(1).max(255).optional(),
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(adjustmentItemSchema).optional(),
  userId: z.string().optional().nullable(),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type UpdateAdjustmentInput = z.infer<typeof updateAdjustmentSchema>;
export type AdjustmentItemInput = z.infer<typeof adjustmentItemSchema>;
