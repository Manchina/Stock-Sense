import { z } from "zod";

export const deliveryItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  productName: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  qtyOrdered: z.number().int().positive().optional(),
  qtyPicked: z.number().int().min(0).optional(),
  qtyDelivered: z.number().int().min(0).optional(),
  unitOfMeasure: z.string().optional(),
});

export const createDeliverySchema = z.object({
  // Customer / partner name
  customerName: z.string().min(1, "Customer/recipient name is required").max(255).optional(),
  partner: z.string().min(1, "Customer/recipient name is required").max(255).optional(),
  customerRef: z.string().max(100).optional().nullable(),

  // Source Warehouse / Location
  sourceWarehouseId: z.string().optional(),
  sourceLocationId: z.string().optional(),
  sourceWarehouse: z.string().optional(),
  sourceLocation: z.string().optional(),

  // Status and validation flag
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).default("draft"),
  validateImmediately: z.boolean().optional().default(false),

  // Dates and metadata
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),

  // Line items
  items: z.array(deliveryItemInputSchema).min(1, "At least one product item is required"),
});

export const updateDeliverySchema = z.object({
  customerName: z.string().min(1).max(255).optional(),
  partner: z.string().min(1).max(255).optional(),
  customerRef: z.string().max(100).optional().nullable(),
  sourceWarehouseId: z.string().optional(),
  sourceLocationId: z.string().optional(),
  sourceLocation: z.string().optional(),
  status: z.enum(["draft", "waiting", "ready", "done", "canceled"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(deliveryItemInputSchema).optional(),
});

export type DeliveryItemInput = z.infer<typeof deliveryItemInputSchema>;
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
