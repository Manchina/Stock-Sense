import { z } from "zod";

export const locationInputSchema = z.union([
  z.string().min(1, "Location name cannot be empty"),
  z.object({
    name: z.string().min(1, "Location name cannot be empty"),
    code: z.string().optional(),
    type: z.string().default("storage"),
    isActive: z.boolean().default(true),
  }),
]);

export const createWarehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required").max(255),
  code: z.string().min(1, "Facility code is required").max(50),
  address: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
  locations: z.array(locationInputSchema).optional().default([]),
});

export const updateWarehouseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  address: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  locations: z.array(locationInputSchema).optional(),
});

export type LocationInput = z.infer<typeof locationInputSchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
