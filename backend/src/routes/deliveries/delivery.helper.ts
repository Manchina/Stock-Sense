import { eq, or, ilike } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses, locations } from "../../db/schema/warehouses.schema";
import { users } from "../../db/schema/users.schema";

/**
 * Generates a clean human-readable delivery order number (e.g. DEL-2026-1042)
 */
export function generateDeliveryNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DEL-${year}-${randomSuffix}`;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isUuid(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Resolves warehouseId and locationId from IDs or human-readable strings (e.g. "WH-MAIN / Packing Zone")
 */
export async function resolveSourceFacility(options: {
  sourceWarehouseId?: string;
  sourceLocationId?: string;
  sourceWarehouse?: string;
  sourceLocation?: string;
}): Promise<{
  warehouseId: string;
  locationId: string | null;
  locationLabel: string;
}> {
  const {
    sourceWarehouseId,
    sourceLocationId,
    sourceWarehouse,
    sourceLocation,
  } = options;

  // 1. If sourceLocationId is explicitly provided as UUID
  if (sourceLocationId && isUuid(sourceLocationId)) {
    const loc = await db.query.locations.findFirst({
      where: eq(locations.id, sourceLocationId),
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

  // 2. Parse from sourceLocation string like "WH-MAIN / Packing Zone"
  if (sourceLocation && sourceLocation.includes("/")) {
    const [whPart, locPart] = sourceLocation.split("/").map((s) => s.trim());
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
  let targetWarehouseId = sourceWarehouseId;
  if (!targetWarehouseId && sourceWarehouse) {
    const searchConditions = [
      eq(warehouses.code, sourceWarehouse.toUpperCase()),
      ilike(warehouses.name, `%${sourceWarehouse}%`),
    ];
    if (isUuid(sourceWarehouse)) {
      searchConditions.push(eq(warehouses.id, sourceWarehouse));
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
 * Formats a delivery order with joined lines into frontend OperationDocument format
 */
export function formatDeliveryResponse(delivery: any) {
  const sourceLocationLabel =
    delivery.sourceLocation?.warehouse
      ? `${delivery.sourceLocation.warehouse.code || delivery.sourceLocation.warehouse.name} / ${delivery.sourceLocation.name}`
      : delivery.sourceWarehouse
      ? `${delivery.sourceWarehouse.code || delivery.sourceWarehouse.name} / ${delivery.sourceLocation?.name || "Packing Zone"}`
      : "Main Warehouse / Dispatch Dock";

  const formattedItems = (delivery.lines || []).map((line: any) => ({
    id: line.id,
    productId: line.productId,
    productName: line.product?.name || "Inventory Product",
    sku: line.product?.sku || "SKU-UNKNOWN",
    quantity: line.qtyDelivered > 0 ? line.qtyDelivered : line.qtyPicked > 0 ? line.qtyPicked : line.qtyOrdered,
    qtyOrdered: line.qtyOrdered,
    qtyPicked: line.qtyPicked,
    qtyDelivered: line.qtyDelivered,
    unitOfMeasure: line.product?.uom || "Units (pcs)",
  }));

  return {
    id: delivery.id,
    documentNumber: delivery.orderNumber,
    orderNumber: delivery.orderNumber,
    type: "delivery" as const,
    status: delivery.status,
    partner: delivery.customerName,
    customerName: delivery.customerName,
    customerRef: delivery.customerRef || undefined,
    sourceWarehouseId: delivery.sourceWarehouseId,
    sourceLocationId: delivery.sourceLocationId,
    sourceLocation: sourceLocationLabel,
    items: formattedItems,
    notes: delivery.notes || "",
    scheduledDate: delivery.scheduledDate ? new Date(delivery.scheduledDate).toISOString().slice(0, 10) : undefined,
    createdAt: delivery.createdAt ? new Date(delivery.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: delivery.updatedAt ? new Date(delivery.updatedAt).toISOString() : new Date().toISOString(),
    validatedAt: delivery.validatedAt ? new Date(delivery.validatedAt).toISOString() : undefined,
    validatedBy: delivery.validator ? delivery.validator.name : undefined,
    createdBy: delivery.creator ? delivery.creator.name : undefined,
  };
}
