import { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses, locations } from "../../db/schema/warehouses.schema";
import { createWarehouseSchema } from "./warehouse.schema";

/**
 * POST /api/v1/warehouses
 * Create a new warehouse facility and its initial storage locations.
 */
export async function createWarehouseHandler(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = createWarehouseSchema.safeParse(body);

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

    const { name, code, address, isActive, locations: locList } = parsed.data;
    const upperCode = code.trim().toUpperCase();

    // Check if code is already taken
    const existing = await db.query.warehouses.findFirst({
      where: eq(warehouses.code, upperCode),
    });

    if (existing) {
      return c.json(
        {
          success: false,
          message: `Warehouse with facility code '${upperCode}' already exists`,
        },
        409
      );
    }

    // Insert warehouse inside transaction
    const created = await db.transaction(async (tx) => {
      const [insertedWarehouse] = await tx
        .insert(warehouses)
        .values({
          name: name.trim(),
          code: upperCode,
          address: address?.trim() || null,
          isActive: isActive ?? true,
        })
        .returning();

      if (!insertedWarehouse) {
        throw new Error("Failed to insert warehouse");
      }

      // Insert locations if provided
      if (locList && locList.length > 0) {
        const locationsToInsert = locList.map((loc, idx) => {
          if (typeof loc === "string") {
            return {
              warehouseId: insertedWarehouse.id,
              name: loc.trim(),
              code: `${upperCode}-LOC-${idx + 1}`,
              type: "storage",
              isActive: true,
            };
          }
          return {
            warehouseId: insertedWarehouse.id,
            name: loc.name.trim(),
            code: loc.code?.trim() || `${upperCode}-LOC-${idx + 1}`,
            type: loc.type || "storage",
            isActive: loc.isActive ?? true,
          };
        });

        await tx.insert(locations).values(locationsToInsert);
      }

      return insertedWarehouse;
    });

    if (!created) {
      throw new Error("Failed to insert warehouse");
    }

    // Retrieve fresh warehouse with locations
    const result = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, created.id),
      with: {
        locations: true,
      },
    });

    if (!result) {
      throw new Error("Failed to load newly created warehouse");
    }

    return c.json(
      {
        success: true,
        message: "Warehouse created successfully",
        data: {
          id: result.id,
          name: result.name,
          code: result.code,
          address: result.address || "",
          isActive: result.isActive,
          locations: result.locations.map((loc) => loc.name),
          locationDetails: result.locations,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
      },
      201
    );
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return c.json(
      {
        success: false,
        message: "Failed to create warehouse",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
