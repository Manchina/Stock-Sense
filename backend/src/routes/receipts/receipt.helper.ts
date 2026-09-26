import { eq, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses, locations } from "../../db/schema/warehouses.schema";
import { users } from "../../db/schema/users.schema";

/**
 * Generates a clean human-readable receipt number (e.g. REC-2026-1042)
 */
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REC-${year}-${randomSuffix}`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Resolves warehouseId and locationId from IDs or human-readable strings (e.g. "WH-MAIN / Rack A")
 */
export async function resolveDestinationFacility(options: {
  destinationWarehouseId?: string;
  destinationLocationId?: string;
  destinationWarehouse?: string;
  destinationLocation?: string;
}): Promise<{
  warehouseId: string;
  locationId: string | null;
  locationLabel: string;
}> {
  const {
    destinationWarehouseId,
    destinationLocationId,
    destinationWarehouse,
    destinationLocation,
  } = options;

  // 1. If destinationLocationId is explicitly provided as UUID
  if (destinationLocationId && isUuid(destinationLocationId)) {
    const loc = await db.query.locations.findFirst({
      where: eq(locations.id, destinationLocationId),
      with: { warehouse: true },
    });

    if (loc) {
      return {
        warehouseId: loc.warehouseId,
        locationId: loc.id,
        locationLabel: `${loc.warehouse.code || loc.warehouse.name} / ${loc.name}`,
      };
    }
  }

  // 2. Parse from destinationLocation string like "WH-MAIN / Rack A"
  if (destinationLocation && destinationLocation.includes("/")) {
    const [whPart, locPart] = destinationLocation.split("/").map((s) => s.trim());
    if (whPart && locPart) {
      const whConditions = [
        eq(warehouses.code, whPart.toUpperCase()),
        ilike(warehouses.name, `%${whPart}%`),
      ];
      if (isUuid(whPart)) {
        whConditions.push(eq(warehouses.id, whPart));
      }

      const wh = await db.query.warehouses.findFirst({
        where: or(...whConditions),
        with: {
          locations: true,
        },
      });

      if (wh) {
        const matchingLoc = wh.locations.find(
          (l) =>
            l.name.toLowerCase() === locPart.toLowerCase() ||
            l.code?.toLowerCase() === locPart.toLowerCase()
        );

        if (matchingLoc) {
          return {
            warehouseId: wh.id,
            locationId: matchingLoc.id,
            locationLabel: `${wh.code} / ${matchingLoc.name}`,
          };
        }

        // Return warehouse with first location or null location
        const firstLoc = wh.locations[0];
        return {
          warehouseId: wh.id,
          locationId: firstLoc?.id || null,
          locationLabel: firstLoc ? `${wh.code} / ${firstLoc.name}` : wh.name,
        };
      }
    }
  }

  // 3. Match warehouse by ID or Name
  let targetWarehouseId = destinationWarehouseId;
  if (!targetWarehouseId && destinationWarehouse) {
    const searchConditions = [
      eq(warehouses.code, destinationWarehouse.toUpperCase()),
      ilike(warehouses.name, `%${destinationWarehouse}%`),
    ];
    if (isUuid(destinationWarehouse)) {
      searchConditions.push(eq(warehouses.id, destinationWarehouse));
    }

    const foundWh = await db.query.warehouses.findFirst({
      where: or(...searchConditions),
    });
    if (foundWh) targetWarehouseId = foundWh.id;
  }

  // 4. Default fallback: Pick first active warehouse & location
  if (targetWarehouseId && isUuid(targetWarehouseId)) {
    const wh = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, targetWarehouseId),
      with: { locations: true },
    });

    if (wh) {
      const loc = wh.locations[0];
      return {
        warehouseId: wh.id,
        locationId: loc?.id || null,
        locationLabel: loc ? `${wh.code} / ${loc.name}` : wh.name,
      };
    }
  }

  const defaultWh = await db.query.warehouses.findFirst({
    where: eq(warehouses.isActive, true),
    with: { locations: true },
  });

  if (!defaultWh) {
    throw new Error("No active warehouse found in database. Please create a warehouse first.");
  }

  const defaultLoc = defaultWh.locations[0];
  return {
    warehouseId: defaultWh.id,
    locationId: defaultLoc?.id || null,
    locationLabel: defaultLoc ? `${defaultWh.code} / ${defaultLoc.name}` : defaultWh.name,
  };
}

/**
 * Resolves a default user ID for audit and creator fields if no JWT token is present
 */
export async function resolveDefaultUserId(authUserId?: string | null): Promise<string> {
  if (authUserId) return authUserId;

  const manager = await db.query.users.findFirst({
    where: eq(users.role, "inventory_manager"),
  });

  if (manager) return manager.id;

  const anyUser = await db.query.users.findFirst();
  if (anyUser) return anyUser.id;

  throw new Error("No users found in database. Please seed users first.");
}

/**
 * Formats a receipt with joined lines into frontend OperationDocument format
 */
export function formatReceiptResponse(receipt: any) {
  const destLocationLabel =
    receipt.destinationLocation?.warehouse
      ? `${receipt.destinationLocation.warehouse.code || receipt.destinationLocation.warehouse.name} / ${receipt.destinationLocation.name}`
      : receipt.destinationWarehouse
      ? `${receipt.destinationWarehouse.code || receipt.destinationWarehouse.name} / ${receipt.destinationLocation?.name || "Main Storage"}`
      : "Main Warehouse / Receiving Bay";

  const formattedItems = (receipt.lines || []).map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || "Inventory Product",
    sku: line.product?.sku || "SKU-UNKNOWN",
    quantity: line.qtyReceived > 0 ? line.qtyReceived : line.qtyExpected,
    qtyExpected: line.qtyExpected,
    qtyReceived: line.qtyReceived,
    unitOfMeasure: line.product?.uom || "Units (pcs)",
  }));

  return {
    id: receipt.id,
    documentNumber: receipt.receiptNumber,
    type: "receipt" as const,
    status: receipt.status,
    partner: receipt.supplierName,
    supplierName: receipt.supplierName,
    destinationWarehouseId: receipt.destinationWarehouseId,
    destinationLocationId: receipt.destinationLocationId,
    destinationLocation: destLocationLabel,
    items: formattedItems,
    notes: receipt.notes || "",
    scheduledDate: receipt.expectedDate ? new Date(receipt.expectedDate).toISOString().slice(0, 10) : undefined,
    expectedDate: receipt.expectedDate ? new Date(receipt.expectedDate).toISOString() : undefined,
    createdAt: receipt.createdAt ? new Date(receipt.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: receipt.updatedAt ? new Date(receipt.updatedAt).toISOString() : new Date().toISOString(),
    validatedAt: receipt.validatedAt ? new Date(receipt.validatedAt).toISOString() : undefined,
    validatedBy: receipt.validator ? receipt.validator.name : undefined,
    createdBy: receipt.creator ? receipt.creator.name : undefined,
  };
}
