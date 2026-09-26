import { eq, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { categories } from "../../db/schema/categories.schema";
import { locations } from "../../db/schema/warehouses.schema";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves a category by UUID or Name. If name is passed and category doesn't exist,
 * automatically creates it with auto-generated slug.
 */
export async function resolveCategoryId(
  categoryId?: string | null,
  categoryName?: string | null
): Promise<string | null> {
  if (categoryId) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });
    if (existing) return existing.id;
  }

  if (categoryName && categoryName.trim().length > 0) {
    const trimmed = categoryName.trim();
    const existing = await db.query.categories.findFirst({
      where: or(
        ilike(categories.name, trimmed),
        eq(categories.slug, slugify(trimmed))
      ),
    });

    if (existing) return existing.id;

    // Auto-create category
    const [created] = await db
      .insert(categories)
      .values({
        name: trimmed,
        slug: slugify(trimmed),
        isActive: true,
      })
      .returning();

    if (created) return created.id;
  }

  return null;
}

/**
 * Resolves a location for initial inventory staging by UUID, location name, or warehouse code.
 * Defaults to the first active storage location if not matched.
 */
export async function resolveStagingLocationId(
  locationId?: string | null,
  initialLocationStr?: string | null
): Promise<string | null> {
  // 1. Direct UUID
  if (locationId) {
    const loc = await db.query.locations.findFirst({
      where: eq(locations.id, locationId),
    });
    if (loc) return loc.id;
  }

  // 2. Name or composite string (e.g., "WH-01 / Main Store (Rack A1)" or "LOC-A1" or "Main Store")
  if (initialLocationStr && initialLocationStr.trim().length > 0) {
    const cleanStr = initialLocationStr.trim();
    // Check if it's formatted like "WH_CODE / LOC_NAME" or "WH_CODE -> LOC_NAME"
    const parts = cleanStr.split(/[/→>-]/).map((p) => p.trim()).filter(Boolean);
    const searchTarget = parts.length > 1 ? parts[parts.length - 1] : cleanStr;

    const loc = await db.query.locations.findFirst({
      where: or(
        ilike(locations.name, `%${searchTarget}%`),
        ilike(locations.code, `%${searchTarget}%`),
        ilike(locations.name, `%${cleanStr}%`)
      ),
    });
    if (loc) return loc.id;
  }

  // 3. Fallback: First active storage location in system
  const defaultLoc = await db.query.locations.findFirst({
    where: eq(locations.isActive, true),
    orderBy: [locations.createdAt],
  });

  return defaultLoc?.id || null;
}

/**
 * Formats a raw product relational record into the standard StockSense product DTO.
 */
export function formatProductResponse(prod: any) {
  const stockLevelsList = prod.stockLevels || [];

  let totalStock = 0;
  const locationStockMap: Record<string, number> = {};
  const detailedStockLevels = [];

  for (const sl of stockLevelsList) {
    const qty = sl.quantity ?? 0;
    totalStock += qty;

    const loc = sl.location;
    const wh = loc?.warehouse;
    const label = wh
      ? `${wh.code || wh.name} / ${loc.name}`
      : loc
      ? loc.name
      : `Location ${sl.locationId}`;

    locationStockMap[label] = qty;

    detailedStockLevels.push({
      id: sl.id,
      locationId: sl.locationId,
      locationName: loc?.name || null,
      locationCode: loc?.code || null,
      warehouseId: wh?.id || null,
      warehouseName: wh?.name || null,
      warehouseCode: wh?.code || null,
      quantity: qty,
      updatedAt: sl.updatedAt ? new Date(sl.updatedAt).toISOString() : null,
    });
  }

  const categoryName = prod.category?.name || "Uncategorized";

  return {
    id: prod.id,
    name: prod.name,
    sku: prod.sku,
    description: prod.description || "",
    category: categoryName,
    categoryId: prod.categoryId,
    categoryDetails: prod.category || null,
    uom: prod.uom,
    unitOfMeasure: prod.uom,
    currentStock: totalStock,
    minStockAlert: prod.reorderPoint ?? 0,
    reorderPoint: prod.reorderPoint ?? 0,
    reorderQty: prod.reorderQty ?? 0,
    costPrice: prod.costPrice != null ? Number(prod.costPrice) : null,
    sellingPrice: prod.sellingPrice != null ? Number(prod.sellingPrice) : null,
    isActive: prod.isActive,
    locationStock: locationStockMap,
    stockLevels: detailedStockLevels,
    reorderRules: prod.reorderRules || [],
    createdAt: prod.createdAt instanceof Date ? prod.createdAt.toISOString() : new Date(prod.createdAt).toISOString(),
    updatedAt: prod.updatedAt instanceof Date ? prod.updatedAt.toISOString() : new Date(prod.updatedAt).toISOString(),
  };
}
