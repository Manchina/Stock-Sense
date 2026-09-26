import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid("Invalid category UUID").optional().nullable(),
  category: z.string().max(255).optional(), // Category name support
  uom: z.string().max(50).default("unit"),
  unitOfMeasure: z.string().max(50).optional(), // Frontend alias
  reorderPoint: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).optional(), // Frontend alias
  reorderQty: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  initialStock: z.number().int().min(0).default(0),
  currentStock: z.number().int().min(0).optional(), // Frontend alias
  locationId: z.string().optional().nullable(), // Location UUID
  initialLocation: z.string().optional().nullable(), // Location name or string
  costPrice: z.number().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid("Invalid category UUID").optional().nullable(),
  category: z.string().max(255).optional(),
  uom: z.string().max(50).optional(),
  unitOfMeasure: z.string().max(50).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  minStockAlert: z.number().int().min(0).optional(),
  reorderQty: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  costPrice: z.number().optional().nullable(),
  sellingPrice: z.number().optional().nullable(),
});

export const reorderRuleSchema = z.object({
  locationId: z.string().uuid("Invalid location ID"),
  minQty: z.number().int().min(0).default(0),
  maxQty: z.number().int().min(0).default(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ReorderRuleInput = z.infer<typeof reorderRuleSchema>;
