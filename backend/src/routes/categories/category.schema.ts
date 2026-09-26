import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  parentId: z.string().uuid("Invalid parent category ID").optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  parentId: z.string().uuid("Invalid parent category ID").optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
