import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { stockLevels } from "../../db/schema/stock-levels.schema";
import { reorderRules } from "../../db/schema/reorder-rules.schema";

/**
 * GET /api/v1/products/:id/stock
 * Get detailed stock breakdown for a product across all warehouses and storage locations.
 */
export async function getProductStockHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();
    if (!id) {
      return c.json({ success: false, message: "Product identifier is required" }, 400);
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    const product = await db.query.products.findFirst({
      where: isUuid
        ? eq(products.id, id)
        : eq(products.sku, id.toUpperCase()),
      with: {
        stockLevels: {
          with: {
            location: {
              with: {
                warehouse: true,
              },
            },
          },
        },
        reorderRules: {
          with: {
            location: true,
          },
        },
      },
    });

    if (!product) {
      return c.json(
        {
          success: false,
          message: "Product not found",
        },
        404
      );
    }

    const rulesMap = new Map<string, { minQty: number; maxQty: number }>();
    for (const rule of product.reorderRules || []) {
      rulesMap.set(rule.locationId, {
        minQty: rule.minQty,
        maxQty: rule.maxQty,
      });
    }

    let totalStock = 0;
    const locationsBreakdown = (product.stockLevels || []).map((sl) => {
      totalStock += sl.quantity;
      const rule = rulesMap.get(sl.locationId);
      return {
        id: sl.id,
        locationId: sl.locationId,
        locationName: sl.location?.name || "Unknown Location",
        locationCode: sl.location?.code || null,
        locationType: sl.location?.type || "storage",
        warehouseId: sl.location?.warehouse?.id || null,
        warehouseName: sl.location?.warehouse?.name || "Unknown Warehouse",
        warehouseCode: sl.location?.warehouse?.code || null,
        quantity: sl.quantity,
        minQty: rule?.minQty ?? 0,
        maxQty: rule?.maxQty ?? 0,
        isLowStock: rule ? sl.quantity <= rule.minQty : sl.quantity <= product.reorderPoint,
        updatedAt: sl.updatedAt ? new Date(sl.updatedAt).toISOString() : null,
      };
    });

    return c.json({
      success: true,
      data: {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        uom: product.uom,
        totalStock,
        globalReorderPoint: product.reorderPoint,
        locations: locationsBreakdown,
      },
    });
  } catch (error) {
    console.error("Error retrieving product stock breakdown:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve product stock breakdown",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
