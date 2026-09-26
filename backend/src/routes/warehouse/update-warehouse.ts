import { Context } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses, locations } from "../../db/schema/warehouses.schema";
import { updateWarehouseSchema } from "./warehouse.schema";

/**
 * PUT /api/v1/warehouses/:id & PATCH /api/v1/warehouses/:id
 * Update an existing warehouse facility and synchronize its internal locations.
 */
export async function updateWarehouseHandler(c: Context) {
  try {
    const id = c.req.param("id");

    if (!id) {
      return c.json(
        {
          success: false,
          message: "Warehouse ID is required",
        },
        400
      );
    }

    const body = await c.req.json();
    const parsed = updateWarehouseSchema.safeParse(body);

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

    const { name, code, address, isActive, locations: newLocList } = parsed.data;

    // Check if target warehouse exists
    const existing = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, id),
      with: { locations: true },
    });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: `Warehouse with ID '${id}' not found`,
        },
        404
      );
    }

    // If code is being updated, verify uniqueness
    let upperCode = existing.code;
    if (code && code.trim().toUpperCase() !== existing.code) {
      upperCode = code.trim().toUpperCase();
      const codeDuplicate = await db.query.warehouses.findFirst({
        where: and(eq(warehouses.code, upperCode), ne(warehouses.id, id)),
      });
      if (codeDuplicate) {
        return c.json(
          {
            success: false,
            message: `Facility code '${upperCode}' is already used by another warehouse`,
          },
          409
        );
      }
    }

    await db.transaction(async (tx) => {
      // Update warehouse fields
      const updateData: Partial<typeof warehouses.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (name !== undefined) updateData.name = name.trim();
      if (code !== undefined) updateData.code = upperCode;
      if (address !== undefined) updateData.address = address?.trim() || null;
      if (isActive !== undefined) updateData.isActive = isActive;

      await tx.update(warehouses).set(updateData).where(eq(warehouses.id, id));

      // Synchronize locations if provided
      if (newLocList !== undefined) {
        // Delete current locations and re-insert given ones
        await tx.delete(locations).where(eq(locations.warehouseId, id));

        if (newLocList.length > 0) {
          const locationsToInsert = newLocList.map((loc, idx) => {
            if (typeof loc === "string") {
              return {
                warehouseId: id,
                name: loc.trim(),
                code: `${upperCode}-LOC-${idx + 1}`,
                type: "storage",
                isActive: true,
              };
            }
            return {
              warehouseId: id,
              name: loc.name.trim(),
              code: loc.code?.trim() || `${upperCode}-LOC-${idx + 1}`,
              type: loc.type || "storage",
              isActive: loc.isActive ?? true,
            };
          });

          await tx.insert(locations).values(locationsToInsert);
        }
      }
    });

    // Fetch updated warehouse
    const updated = await db.query.warehouses.findFirst({
      where: eq(warehouses.id, id),
      with: { locations: true },
    });

    if (!updated) {
      throw new Error("Failed to load updated warehouse");
    }

    return c.json({
      success: true,
      message: "Warehouse updated successfully",
      data: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        address: updated.address || "",
        isActive: updated.isActive,
        locations: updated.locations.map((loc) => loc.name),
        locationDetails: updated.locations,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return c.json(
      {
        success: false,
        message: "Failed to update warehouse",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
