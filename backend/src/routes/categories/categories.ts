import { Context } from "hono";
import { eq, or, desc, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { categories } from "../../db/schema/categories.schema";
import { products } from "../../db/schema/products.schema";
import { createCategorySchema, updateCategorySchema } from "./category.schema";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * GET /api/v1/categories
 * List all categories with product count and hierarchy
 */
export async function getCategoriesHandler(c: Context) {
  try {
    const allCategories = await db.query.categories.findMany({
      orderBy: [desc(categories.createdAt)],
      with: {
        parent: true,
        products: {
          columns: {
            id: true,
          },
        },
      },
    });

    const formatted = allCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      parentId: cat.parentId,
      parentName: cat.parent?.name || null,
      isActive: cat.isActive,
      productCount: cat.products?.length || 0,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    }));

    return c.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve categories",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * GET /api/v1/categories/:id
 * Get single category by UUID or slug
 */
export async function getCategoryByIdHandler(c: Context) {
  try {
    const idOrSlug = c.req.param("id");

    const category = await db.query.categories.findFirst({
      where: or(eq(categories.id, idOrSlug), eq(categories.slug, idOrSlug)),
      with: {
        parent: true,
        children: true,
        products: true,
      },
    });

    if (!category) {
      return c.json(
        {
          success: false,
          message: "Category not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        parentId: category.parentId,
        parent: category.parent,
        children: category.children,
        isActive: category.isActive,
        productCount: category.products?.length || 0,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error retrieving category:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve category",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * POST /api/v1/categories
 * Create a new category
 */
export async function createCategoryHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createCategorySchema.safeParse(body);

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

    const { name, slug, description, parentId, isActive } = parsed.data;
    const finalSlug = slug?.trim() || slugify(name);

    // Check slug collision
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, finalSlug),
    });

    if (existing) {
      return c.json(
        {
          success: false,
          message: `Category with slug '${finalSlug}' already exists`,
        },
        409
      );
    }

    const [created] = await db
      .insert(categories)
      .values({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        parentId: parentId || null,
        isActive: isActive ?? true,
      })
      .returning();

    return c.json(
      {
        success: true,
        message: "Category created successfully",
        data: created,
      },
      201
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json(
      {
        success: false,
        message: "Failed to create category",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * PUT /:id & PATCH /:id
 * Update category details
 */
export async function updateCategoryHandler(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = updateCategorySchema.safeParse(body);

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

    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "Category not found",
        },
        404
      );
    }

    const updateData: Partial<typeof categories.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name.trim();
    }
    if (parsed.data.slug !== undefined) {
      updateData.slug = parsed.data.slug.trim();
    }
    if (parsed.data.description !== undefined) {
      updateData.description = parsed.data.description?.trim() || null;
    }
    if (parsed.data.parentId !== undefined) {
      // Prevent circular reference
      if (parsed.data.parentId === id) {
        return c.json(
          {
            success: false,
            message: "A category cannot be its own parent",
          },
          400
        );
      }
      updateData.parentId = parsed.data.parentId || null;
    }
    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }

    const [updated] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return c.json({
      success: true,
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update category",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

/**
 * DELETE /:id
 * Delete or deactivate category
 */
export async function deleteCategoryHandler(c: Context) {
  try {
    const id = c.req.param("id");

    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        products: true,
        children: true,
      },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "Category not found",
        },
        404
      );
    }

    if (existing.products && existing.products.length > 0) {
      // Cannot hard delete if products reference it; soft delete instead
      await db
        .update(categories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(categories.id, id));

      return c.json({
        success: true,
        message:
          "Category has assigned products and was deactivated instead of deleted",
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return c.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json(
      {
        success: false,
        message: "Failed to delete category",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
