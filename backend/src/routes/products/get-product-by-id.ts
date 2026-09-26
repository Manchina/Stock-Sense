import { Context } from "hono";
import { eq, or, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { formatProductResponse } from "./product.helper";

/**
 * GET /api/v1/products/:id
 * Retrieve single product by UUID or SKU with relational stock breakdown.
 */
export async function getProductByIdHandler(c: Context) {
  try {
    const idOrSku = c.req.param("id")?.trim();

    if (!idOrSku) {
      return c.json(
        {
          success: false,
          message: "Product identifier is required",
        },
        400
      );
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSku
      );

    const productRow = await db.query.products.findFirst({
      where: isUuid
        ? eq(products.id, idOrSku)
        : eq(products.sku, idOrSku.toUpperCase()),
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

    if (!productRow) {
      return c.json(
        {
          success: false,
          message: `Product with identifier '${idOrSku}' not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: formatProductResponse(productRow),
    });
  } catch (error) {
    console.error("Error retrieving product:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve product",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
