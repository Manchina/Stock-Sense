import { Hono } from "hono";
import { getProductsHandler } from "./get-products";
import { getProductByIdHandler } from "./get-product-by-id";
import { createProductHandler } from "./create-product";
import { updateProductHandler } from "./update-product";
import { deleteProductHandler } from "./delete-product";
import { getProductStockHandler } from "./get-product-stock";
import {
  getProductReorderRulesHandler,
  setProductReorderRuleHandler,
  getLowStockAlertsHandler,
} from "./reorder-rules";

const productsRouter = new Hono();

// Specific routes first to prevent route shadowing by /:id
productsRouter.get("/alerts/low-stock", getLowStockAlertsHandler);
productsRouter.get("/low-stock", getLowStockAlertsHandler);

// GET / - List all products with filters
productsRouter.get("/", getProductsHandler);

// POST / - Create new product with optional atomic initial stock
productsRouter.post("/", createProductHandler);

// GET /:id - Single product by ID or SKU
productsRouter.get("/:id", getProductByIdHandler);

// PUT /:id & PATCH /:id - Update product
productsRouter.put("/:id", updateProductHandler);
productsRouter.patch("/:id", updateProductHandler);

// DELETE /:id - Delete or deactivate product
productsRouter.delete("/:id", deleteProductHandler);

// GET /:id/stock - Detailed location stock breakdown
productsRouter.get("/:id/stock", getProductStockHandler);

// GET & POST /:id/reorder-rules - Reorder thresholds
productsRouter.get("/:id/reorder-rules", getProductReorderRulesHandler);
productsRouter.post("/:id/reorder-rules", setProductReorderRuleHandler);

export { productsRouter };
export * from "./product.schema";
export * from "./get-products";
export * from "./get-product-by-id";
export * from "./create-product";
export * from "./update-product";
export * from "./delete-product";
export * from "./get-product-stock";
export * from "./reorder-rules";
