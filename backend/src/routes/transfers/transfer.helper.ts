import { eq, or, ilike, desc } from "drizzle-orm";
import { db } from "../../config/db";
import { locations } from "../../db/schema/warehouses.schema";
import { products } from "../../db/schema/products.schema";
import { users } from "../../db/schema/users.schema";
import { transfers } from "../../db/schema/transfers.schema";

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
    throw new Error("No active user found in database to assign as transfer operator");
  }

  return defaultUser.id;
}

/**
 * Generates the next sequential or randomized transfer number (e.g., INT-2026-0001).
 */
export async function generateTransferNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INT-${currentYear}-`;

  const latest = await db.query.transfers.findFirst({
    where: ilike(transfers.transferNumber, `${prefix}%`),
    orderBy: [desc(transfers.createdAt)],
  });

  if (latest && latest.transferNumber.startsWith(prefix)) {
    const parts = latest.transferNumber.split("-");
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
 * Formats a raw relational transfer record into a unified Transfer DTO.
 */
export function formatTransferResponse(t: any) {
  const srcWh = t.sourceLocation?.warehouse;
  const srcLoc = t.sourceLocation;
  const sourceLabel = srcWh
    ? `${srcWh.code || srcWh.name} / ${srcLoc?.name || "General"}`
    : srcLoc?.name || "Unknown Source";

  const dstWh = t.destLocation?.warehouse;
  const dstLoc = t.destLocation;
  const destLabel = dstWh
    ? `${dstWh.code || dstWh.name} / ${dstLoc?.name || "General"}`
    : dstLoc?.name || "Unknown Destination";

  const formattedLines = (t.lines || []).map((line: any) => ({
    id: line.id,
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    quantity: line.quantity,
    unitOfMeasure: line.product?.uom || "units",
  }));

  return {
    id: t.id,
    transferNumber: t.transferNumber,
    documentNumber: t.transferNumber,
    type: "internal" as const,
    status: t.status,
    sourceLocationId: t.sourceLocationId,
    destLocationId: t.destLocationId,
    sourceLocation: sourceLabel,
    destinationLocation: destLabel,
    notes: t.notes || "",
    items: formattedLines,
    lines: formattedLines,
    validatedAt: t.validatedAt ? new Date(t.validatedAt).toISOString() : undefined,
    validatedBy: t.validator?.name || undefined,
    createdBy: t.creator?.name || undefined,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : new Date(t.updatedAt).toISOString(),
  };
}
