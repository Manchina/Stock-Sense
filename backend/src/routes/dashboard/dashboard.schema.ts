import { z } from "zod";

export const dashboardOperationsQuerySchema = z.object({
  docType: z
    .enum(["all", "receipt", "delivery", "internal", "adjustment"])
    .optional()
    .default("all"),
  documentType: z
    .enum(["all", "receipt", "delivery", "internal", "adjustment"])
    .optional(),
  status: z
    .enum(["all", "draft", "waiting", "ready", "done", "canceled"])
    .optional()
    .default("all"),
  warehouseId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export type DashboardOperationsQuery = z.infer<typeof dashboardOperationsQuerySchema>;
