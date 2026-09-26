import { z } from "zod";

export const receiptItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  qtyExpected: z.number().int().positive().optional(),
  qtyReceived: z.number().int().min(0).optional(),
  unitOfMeasure: z.string().optional(),
});

export const createReceiptSchema = z.object({
  // Supplier / partner name
  supplierName: z.string().min(1, "Supplier/vendor name is required").max(255).optional(),
  partner: z.string().min(1, "Supplier/vendor name is required").max(255).optional(),

  // Destination Warehouse / Location
  destinationWarehouseId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  destinationWarehouse: z.string().optional(),
  destinationLocation: z.string().optional(),

  // Status and validation flag
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).default("ready"),
  validateImmediately: z.boolean().optional().default(false),

  // Dates and metadata
  expectedDate: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),

  // Line items
  items: z.array(receiptItemInputSchema).min(1, "At least one product item is required"),
});

export const updateReceiptSchema = z.object({
  supplierName: z.string().min(1).max(255).optional(),
  partner: z.string().min(1).max(255).optional(),
  destinationWarehouseId: z.string().optional(),
  destinationLocationId: z.string().optional(),
  destinationLocation: z.string().optional(),
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).optional(),
  expectedDate: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(receiptItemInputSchema).optional(),
});

export type ReceiptItemInput = z.infer<typeof receiptItemInputSchema>;
export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;
