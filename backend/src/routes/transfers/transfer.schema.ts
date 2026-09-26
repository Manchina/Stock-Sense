import { z } from "zod";

export const transferItemSchema = z.object({
  productId: z.string().min(1, "Product ID or name is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unitOfMeasure: z.string().optional(),
});

export const createTransferSchema = z.object({
  transferNumber: z.string().max(100).optional(),
  documentNumber: z.string().max(100).optional(), // Frontend alias
  sourceLocationId: z.string().optional().nullable(),
  sourceLocation: z.string().optional().nullable(), // Frontend location string e.g. "WH-MAIN / Rack A"
  destLocationId: z.string().optional().nullable(),
  destinationLocationId: z.string().optional().nullable(), // Alias
  destinationLocation: z.string().optional().nullable(), // Frontend location string e.g. "WH-PROD / Production Floor"
  destLocation: z.string().optional().nullable(), // Alias
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).default("draft"),
  notes: z.string().max(2000).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  items: z.array(transferItemSchema).min(1, "At least one item is required for transfer"),
  userId: z.string().optional().nullable(),
});

export const updateTransferSchema = z.object({
  sourceLocationId: z.string().optional().nullable(),
  sourceLocation: z.string().optional().nullable(),
  destLocationId: z.string().optional().nullable(),
  destinationLocation: z.string().optional().nullable(),
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  items: z.array(transferItemSchema).optional(),
  userId: z.string().optional().nullable(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type UpdateTransferInput = z.infer<typeof updateTransferSchema>;
export type TransferItemInput = z.infer<typeof transferItemSchema>;
