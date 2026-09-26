import { Hono } from "hono";
import { getStatsHandler } from "./get-stats";
import { getOperationsHandler } from "./get-operations";

const dashboardRouter = new Hono();

// GET /stats - Real-time KPI metrics and monthly breakdown
dashboardRouter.get("/stats", getStatsHandler);

// GET /operations - Unified multidimensional filtered operations
dashboardRouter.get("/operations", getOperationsHandler);

export { dashboardRouter };
export * from "./dashboard.schema";
export * from "./dashboard.helper";
export * from "./get-stats";
export * from "./get-operations";
