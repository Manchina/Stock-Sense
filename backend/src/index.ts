import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { testConnection } from "./config/db";
import { env } from "./config/env";
import { warehouseRouter } from "./routes/warehouse";
import { productsRouter } from "./routes/products";
import { categoriesRouter } from "./routes/categories";
import { transfersRouter } from "./routes/transfers";
import { adjustmentsRouter } from "./routes/adjustments";
import { historyRouter } from "./routes/history";
import { receiptsRouter } from "./routes/receipts";
import { deliveriesRouter } from "./routes/deliveries";
import { dashboardRouter } from "./routes/dashboard";

import { errorHandler } from "./middleware/error.middleware";
import { authRoutes } from "./modules/auth/auth.routes";

const app = new Hono();

// Global Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
);

// Register global error handler
app.onError(errorHandler);

// Basic health check endpoint
app.get("/health", async (c) => {
  const dbHealth = await testConnection();
  return c.json({
    status: dbHealth.ok ? "healthy" : "degraded",
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    database: {
      connected: dbHealth.ok,
      serverTime: dbHealth.timestamp,
      error: dbHealth.error,
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.route("/api/v1/dashboard", dashboardRouter);
app.route("/api/dashboard", dashboardRouter);

app.route("/api/v1/warehouses", warehouseRouter);
app.route("/api/warehouses", warehouseRouter);

app.route("/api/v1/products", productsRouter);
app.route("/api/products", productsRouter);

app.route("/api/v1/categories", categoriesRouter);
app.route("/api/categories", categoriesRouter);

app.route("/api/v1/transfers", transfersRouter);
app.route("/api/transfers", transfersRouter);

app.route("/api/v1/adjustments", adjustmentsRouter);
app.route("/api/adjustments", adjustmentsRouter);

app.route("/api/v1/history", historyRouter);
app.route("/api/history", historyRouter);

app.route("/api/v1/receipts", receiptsRouter);
app.route("/api/receipts", receiptsRouter);
app.route("/api/v1/recipients", receiptsRouter);
app.route("/api/recipients", receiptsRouter);

app.route("/api/v1/deliveries", deliveriesRouter);
app.route("/api/deliveries", deliveriesRouter);
app.route("/api/v1/operations/deliveries", deliveriesRouter);
app.route("/api/operations/deliveries", deliveriesRouter);

app.get("/", (c) => {
  return c.json({
    name: "StockSense API",
    version: "1.0.0",
    description: "Production-grade Inventory Management System API",
    healthCheck: "/health",
    endpoints: {
      dashboard: "/api/v1/dashboard",
      warehouses: "/api/v1/warehouses",
      products: "/api/v1/products",
      categories: "/api/v1/categories",
      transfers: "/api/v1/transfers",
      adjustments: "/api/v1/adjustments",
      history: "/api/v1/history",
      receipts: "/api/v1/receipts",
      deliveries: "/api/v1/deliveries",
    },
  });
});

// Mount Auth routes under /auth and /api/v1/auth
app.route("/auth", authRoutes);
app.route("/api/v1/auth", authRoutes);
app.route("/api/auth", authRoutes);

export const server =
  env.NODE_ENV === "test" || process.env.VITEST
    ? null
    : serve(
      {
        fetch: app.fetch,
        port: env.PORT,
      },
      (info) => {
        console.log(`🚀 StockSense API server listening on http://localhost:${info.port}`);
      }
    );

export default app;
