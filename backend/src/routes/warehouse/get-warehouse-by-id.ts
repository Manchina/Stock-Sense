import { Context } from "hono";
import { eq, or } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses } from "../../db/schema/warehouses.schema";

/**
 * GET /api/v1/warehouses/:id
 * Retrieve a specific warehouse by UUID or unique facility code.
 */
export async function getWarehouseByIdHandler(c: Context) {
  try {
    const idOrCode = c.req.param("id");

    if (!idOrCode) {
      return c.json(
        {
          success: false,
          message: "Warehouse ID or code is required",
        },
        400
      );
    }

    const warehouse = await db.query.warehouses.findFirst({
      where: or(eq(warehouses.id, idOrCode), eq(warehouses.code, idOrCode.toUpperCase())),
      with: {
        locations: true,
      },
    });

    if (!warehouse) {
      return c.json(
        {
          success: false,
          message: `Warehouse not found with ID or code '${idOrCode}'`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address || "",
        isActive: warehouse.isActive,
        locations: warehouse.locations.map((loc) => loc.name),
        locationDetails: warehouse.locations,
        createdAt: warehouse.createdAt.toISOString(),
        updatedAt: warehouse.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching warehouse by id:", error);
    return c.json(
      {
        success: false,
        message: "Failed to fetch warehouse",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
