import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { createProductSchema } from "./product.schema";
import {
  resolveCategoryId,
  resolveStagingLocationId,
  formatProductResponse,
} from "./product.helper";
import { executeStockMovement } from "../../services/stock.service";

/**
 * POST /api/v1/products
 * Register a new product item, optionally allocating initial stock via atomic ledger transaction.
 */
export async function createProductHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createProductSchema.safeParse(body);

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
      initialStock,
      currentStock,
      locationId,
      initialLocation,
    } = parsed.data;

    const normalizedSku = sku.trim().toUpperCase();

    // 1. Uniqueness check for SKU
    const existing = await db.query.products.findFirst({
      where: eq(products.sku, normalizedSku),
    });

    if (existing) {
      return c.json(
        {
          success: false,
          message: `Product with SKU '${normalizedSku}' already exists`,
        },
        409
      );
    }

    // 2. Resolve category ID
    const finalCategoryId = await resolveCategoryId(categoryId, category);

    // 3. Resolve initial stock and location
    const initialQty = initialStock || currentStock || 0;
    const finalUom = unitOfMeasure?.trim() || uom?.trim() || "unit";
    const finalReorderPoint = minStockAlert ?? reorderPoint ?? 0;

    // Optional user context from auth middleware
    const currentUser = c.get("user") as { id: string } | undefined;

    let stagingLocationId: string | null = null;
    if (initialQty > 0) {
      stagingLocationId = await resolveStagingLocationId(
        locationId,
        initialLocation
      );

      if (!stagingLocationId) {
        return c.json(
          {
            success: false,
            message:
              "Cannot assign initial stock: No active warehouse location was found. Please create a warehouse location first.",
          },
          400
        );
      }
    }

    // 4. Create product with atomic transaction for initial inventory if qty > 0
    const createdProduct = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(products)
        .values({
          name: name.trim(),
          sku: normalizedSku,
          description: description?.trim() || null,
          categoryId: finalCategoryId,
          uom: finalUom,
          reorderPoint: finalReorderPoint,
          reorderQty: reorderQty || 0,
          costPrice: costPrice !== undefined && costPrice !== null ? String(costPrice) : null,
          sellingPrice: sellingPrice !== undefined && sellingPrice !== null ? String(sellingPrice) : null,
          isActive: isActive ?? true,
        })
        .returning();

      if (!inserted) {
        throw new Error("Failed to insert product record");
      }

      // If initial stock provided, execute atomic stock movement & ledger entry
      if (initialQty > 0 && stagingLocationId) {
        await executeStockMovement(tx, {
          productId: inserted.id,
          locationId: stagingLocationId,
          deltaQty: initialQty,
          sourceType: "initial_inventory",
          notes: "Initial inventory allocation on product registration",
          userId: currentUser?.id || null,
        });
      }

      return inserted;
    });

    // 5. Fetch newly created product with full relational data
    const fullProduct = await db.query.products.findFirst({
      where: eq(products.id, createdProduct.id),
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

    if (!fullProduct) {
      throw new Error("Failed to load newly created product");
    }

    return c.json(
      {
        success: true,
        message: "Product created successfully",
        data: formatProductResponse(fullProduct),
      },
      201
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return c.json(
      {
        success: false,
        message: "Failed to create product",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
