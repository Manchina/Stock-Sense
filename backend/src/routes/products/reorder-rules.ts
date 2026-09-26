import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { reorderRules } from "../../db/schema/reorder-rules.schema";
import { reorderRuleSchema } from "./product.schema";
import { formatProductResponse } from "./product.helper";

/**
 * GET /api/v1/products/:id/reorder-rules
 * Get configured reorder rules for a product.
 */
export async function getProductReorderRulesHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();
    if (!id) {
      return c.json({ success: false, message: "Product ID is required" }, 400);
    }

    const rules = await db.query.reorderRules.findMany({
      where: eq(reorderRules.productId, id),
      with: {
        location: {
          with: {
            warehouse: true,
          },
        },
      },
    });

    return c.json({
      success: true,
      count: rules.length,
      data: rules.map((r) => ({
        id: r.id,
        productId: r.productId,
        locationId: r.locationId,
        locationName: r.location?.name,
        warehouseName: r.location?.warehouse?.name,
        warehouseCode: r.location?.warehouse?.code,
        minQty: r.minQty,
        maxQty: r.maxQty,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error retrieving reorder rules:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve reorder rules",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * POST /api/v1/products/:id/reorder-rules
 * Upsert reorder thresholds (min_qty, max_qty) for a product at a specific location.
 */
export async function setProductReorderRuleHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();
    if (!id) {
      return c.json({ success: false, message: "Product ID is required" }, 400);
    }
    const body = await c.req.json();
    const parsed = reorderRuleSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.error.format(),
        },
        400
      );
    }

    const { locationId, minQty, maxQty } = parsed.data;

    // Check existing rule
    const existingRule = await db.query.reorderRules.findFirst({
      where: and(
        eq(reorderRules.productId, id),
        eq(reorderRules.locationId, locationId)
      ),
    });

    if (existingRule) {
      const [updated] = await db
        .update(reorderRules)
        .set({
          minQty,
          maxQty,
          updatedAt: new Date(),
        })
        .where(eq(reorderRules.id, existingRule.id))
        .returning();

      return c.json({
        success: true,
        message: "Reorder rule updated successfully",
        data: updated,
      });
    }

    if (!locationId) {
      return c.json({ success: false, message: "Location ID is required" }, 400);
    }

    const [created] = await db
      .insert(reorderRules)
      .values({
        productId: id,
        locationId: locationId,
        minQty: minQty ?? 0,
        maxQty: maxQty ?? 0,
      })
      .returning();

    return c.json(
      {
        success: true,
        message: "Reorder rule created successfully",
        data: created,
      },
      201
    );
  } catch (error) {
    console.error("Error setting reorder rule:", error);
    return c.json(
      {
        success: false,
        message: "Failed to save reorder rule",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * GET /api/v1/products/alerts/low-stock
 * Retrieve all items that are either out-of-stock or currently at or below their reorder threshold.
 */
export async function getLowStockAlertsHandler(c: Context) {
  try {
    const productRows = await db.query.products.findMany({
      where: eq(products.isActive, true),
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
    });

    const allFormatted = productRows.map(formatProductResponse);

    // Filter items where total stock <= reorder point or = 0
    const lowStockItems = allFormatted.filter(
      (p) => p.currentStock <= p.minStockAlert
    );

    return c.json({
      success: true,
      count: lowStockItems.length,
      data: lowStockItems,
    });
  } catch (error) {
    console.error("Error retrieving low stock alerts:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve low stock alerts",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
