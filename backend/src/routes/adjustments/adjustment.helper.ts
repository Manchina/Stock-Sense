import { eq, or, ilike, desc } from "drizzle-orm";
import { db } from "../../config/db";
import { locations } from "../../db/schema/warehouses.schema";
import { products } from "../../db/schema/products.schema";
import { users } from "../../db/schema/users.schema";
import { adjustments } from "../../db/schema/adjustments.schema";

/**
 * Resolves a warehouse location UUID by ID, code, or composite name (e.g. "WH-MAIN / Rack A").
 */
export async function resolveLocation(
  locationId?: string | null,
  locationStr?: string | null
): Promise<{ id: string; name: string; fullLabel: string } | null> {
  // 1. Direct UUID match
  if (locationId) {
    const loc = await db.query.locations.findFirst({
      where: eq(locations.id, locationId),
      with: { warehouse: true },
    });
    if (loc) {
      const fullLabel = loc.warehouse
        ? `${loc.warehouse.code || loc.warehouse.name} / ${loc.name}`
        : loc.name;
      return { id: loc.id, name: loc.name, fullLabel };
    }
  }

  // 2. String representation match
  if (locationStr && locationStr.trim().length > 0) {
    const cleanStr = locationStr.trim();
    const parts = cleanStr.split(/[/→>-]/).map((p) => p.trim()).filter(Boolean);
    const searchTarget = parts.length > 1 ? (parts[parts.length - 1] ?? cleanStr) : cleanStr;

    const loc = await db.query.locations.findFirst({
      where: or(
        ilike(locations.name, `%${searchTarget}%`),
        ilike(locations.code, `%${searchTarget}%`),
        ilike(locations.name, `%${cleanStr}%`)
      ),
      with: { warehouse: true },
    });

    if (loc) {
      const fullLabel = loc.warehouse
        ? `${loc.warehouse.code || loc.warehouse.name} / ${loc.name}`
        : loc.name;
      return { id: loc.id, name: loc.name, fullLabel };
    }
  }

  return null;
}

/**
 * Resolves a product UUID by ID, SKU, or name.
 */
export async function resolveProduct(
  productId?: string | null,
  sku?: string | null,
  productName?: string | null
): Promise<{ id: string; name: string; sku: string; uom: string } | null> {
  if (productId) {
    const prod = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (prod) return { id: prod.id, name: prod.name, sku: prod.sku, uom: prod.uom };
  }

  if (sku) {
    const prod = await db.query.products.findFirst({
      where: eq(products.sku, sku.trim().toUpperCase()),
    });
    if (prod) return { id: prod.id, name: prod.name, sku: prod.sku, uom: prod.uom };
  }

  if (productName) {
    const prod = await db.query.products.findFirst({
      where: ilike(products.name, productName.trim()),
    });
    if (prod) return { id: prod.id, name: prod.name, sku: prod.sku, uom: prod.uom };
  }

  return null;
}

/**
 * Gets a default user UUID (manager or warehouse staff) if not provided by auth header.
 */
export async function resolveUserId(userId?: string | null): Promise<string> {
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user) return user.id;
  }

  const defaultUser = await db.query.users.findFirst({
    where: eq(users.isActive, true),
    orderBy: [users.createdAt],
  });

  if (!defaultUser) {
    throw new Error("No active user found in database to assign as adjustment operator");
  }

  return defaultUser.id;
}

/**
 * Generates the next sequential or randomized adjustment number (e.g., ADJ-2026-0001).
 */
export async function generateAdjustmentNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `ADJ-${currentYear}-`;

  const latest = await db.query.adjustments.findFirst({
    where: ilike(adjustments.adjustmentNumber, `${prefix}%`),
    orderBy: [desc(adjustments.createdAt)],
  });

  if (latest && latest.adjustmentNumber.startsWith(prefix)) {
    const parts = latest.adjustmentNumber.split("-");
    const lastPart = parts[parts.length - 1] ?? "0";
    const lastNum = parseInt(lastPart, 10);
    if (!isNaN(lastNum)) {
      const nextSeq = String(lastNum + 1).padStart(4, "0");
      return `${prefix}${nextSeq}`;
    }
  }

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
}

/**
 * Formats a raw relational adjustment record into a unified Adjustment DTO.
 */
export function formatAdjustmentResponse(a: any) {
  const wh = a.location?.warehouse;
  const loc = a.location;
  const locationLabel = wh
    ? `${wh.code || wh.name} / ${loc?.name || "General"}`
    : loc?.name || "Unknown Location";

  const formattedLines = (a.lines || []).map((line: any) => ({
    id: line.id,
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    recordedQty: line.recordedQty,
    countedQty: line.countedQty,
    deltaQty: line.deltaQty,
    quantity: line.deltaQty, // Frontend alias
    unitOfMeasure: line.product?.uom || "units",
  }));

  return {
    id: a.id,
    adjustmentNumber: a.adjustmentNumber,
    documentNumber: a.adjustmentNumber,
    type: "adjustment" as const,
    status: a.status,
    locationId: a.locationId,
    location: locationLabel,
    sourceLocation: locationLabel,
    reason: a.reason,
    notes: a.notes || a.reason || "",
    items: formattedLines,
    lines: formattedLines,
    appliedAt: a.appliedAt ? new Date(a.appliedAt).toISOString() : undefined,
    validatedAt: a.appliedAt ? new Date(a.appliedAt).toISOString() : undefined,
    appliedBy: a.applier?.name || undefined,
    validatedBy: a.applier?.name || undefined,
    createdBy: a.creator?.name || undefined,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date(a.createdAt).toISOString(),
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : new Date(a.updatedAt).toISOString(),
  };
}
