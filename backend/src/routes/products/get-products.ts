import { Context } from "hono";
import { eq, ilike, or, desc, and, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { categories } from "../../db/schema/categories.schema";
import { formatProductResponse } from "./product.helper";

/**
 * GET /api/v1/products
 * List all products with search, category filter, stock status, and per-location stock aggregation.
 */
export async function getProductsHandler(c: Context) {
  try {
    const search = c.req.query("search")?.trim();
    const categoryQuery = c.req.query("category")?.trim();
    const statusQuery = c.req.query("status")?.trim(); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
    const isActiveQuery = c.req.query("isActive");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      );
    }

    if (isActiveQuery !== undefined) {
      conditions.push(eq(products.isActive, isActiveQuery === "true"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch products with full relational data
    const productRows = await db.query.products.findMany({
      where: whereClause,
      with: {
        category: true,
        stockLevels: {
          with: {
            location: {
              with: {
                warehouse: true,
              },
            },
          },
        },
        reorderRules: true,
      },
      orderBy: [desc(products.createdAt)],
    });

    let formatted = productRows.map(formatProductResponse);

    // Apply category filter (if not "all")
    if (categoryQuery && categoryQuery !== "all") {
      formatted = formatted.filter(
        (p) =>
          p.categoryId === categoryQuery ||
          p.category.toLowerCase() === categoryQuery.toLowerCase()
      );
    }

    // Apply stock status filter
    if (statusQuery && statusQuery !== "all") {
      if (statusQuery === "in_stock") {
        formatted = formatted.filter((p) => p.currentStock > p.minStockAlert);
      } else if (statusQuery === "low_stock") {
        formatted = formatted.filter(
          (p) => p.currentStock <= p.minStockAlert && p.currentStock > 0
        );
      } else if (statusQuery === "out_of_stock") {
        formatted = formatted.filter((p) => p.currentStock <= 0);
      }
    }

    return c.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error retrieving products:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve products",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
