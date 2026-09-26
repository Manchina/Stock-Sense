import { Context } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { updateProductSchema } from "./product.schema";
import { resolveCategoryId, formatProductResponse } from "./product.helper";

/**
 * PUT /:id & PATCH /:id
 * Update product master information. Supports lookup by UUID or SKU.
 */
export async function updateProductHandler(c: Context) {
  try {
    const id = c.req.param("id")?.trim();
    if (!id) {
      return c.json(
        {
          success: false,
          message: "Product identifier is required",
        },
        400
      );
    }

    const body = await c.req.json();
    const parsed = updateProductSchema.safeParse(body);

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

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      );

    // 1. Check existing product by UUID or SKU
    const existing = await db.query.products.findFirst({
      where: isUuid
        ? eq(products.id, id)
        : eq(products.sku, id.toUpperCase()),
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: `Product '${id}' not found`,
        },
        404
      );
    }

    const productId = existing.id;

    const {
      name,
      sku,
      description,
      categoryId,
      category,
      uom,
      unitOfMeasure,
      reorderPoint,
      minStockAlert,
      reorderQty,
      isActive,
      costPrice,
      sellingPrice,
    } = parsed.data;

    // 2. If SKU changes, verify uniqueness
    if (sku && sku.trim().toUpperCase() !== existing.sku.toUpperCase()) {
      const newSku = sku.trim().toUpperCase();
      const skuConflict = await db.query.products.findFirst({
        where: and(eq(products.sku, newSku), ne(products.id, productId)),
      });

      if (skuConflict) {
        return c.json(
          {
            success: false,
            message: `Product SKU '${newSku}' is already taken by another product`,
          },
          409
        );
      }
    }

    // 3. Resolve category ID if passed
    let resolvedCatId = undefined;
    if (categoryId !== undefined || category !== undefined) {
      resolvedCatId = await resolveCategoryId(categoryId, category);
    }

    const updatePayload: Partial<typeof products.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updatePayload.name = name.trim();
    if (sku !== undefined) updatePayload.sku = sku.trim().toUpperCase();
    if (description !== undefined) updatePayload.description = description?.trim() || null;
    if (resolvedCatId !== undefined) updatePayload.categoryId = resolvedCatId;
    if (unitOfMeasure !== undefined) updatePayload.uom = unitOfMeasure.trim();
    else if (uom !== undefined) updatePayload.uom = uom.trim();
    if (minStockAlert !== undefined) updatePayload.reorderPoint = minStockAlert;
    else if (reorderPoint !== undefined) updatePayload.reorderPoint = reorderPoint;
    if (reorderQty !== undefined) updatePayload.reorderQty = reorderQty;
    if (isActive !== undefined) updatePayload.isActive = isActive;

    if (costPrice !== undefined) {
      updatePayload.costPrice = costPrice !== null ? String(costPrice) : null;
    }
    if (sellingPrice !== undefined) {
      updatePayload.sellingPrice = sellingPrice !== null ? String(sellingPrice) : null;
    }

    await db.update(products).set(updatePayload).where(eq(products.id, productId));

    // Reload product with relations
    const updated = await db.query.products.findFirst({
      where: eq(products.id, productId),
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

    if (!updated) {
      throw new Error("Failed to load updated product");
    }

    return c.json({
      success: true,
      message: "Product updated successfully",
      data: formatProductResponse(updated),
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update product",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
