import { Context } from "hono";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import { db } from "../../config/db";
import { warehouses, locations } from "../../db/schema/warehouses.schema";

/**
 * GET /api/v1/warehouses
 * List all warehouses with their locations, supporting search and status filtering.
 */
export async function getWarehousesHandler(c: Context) {
  try {
    const search = c.req.query("search")?.trim();
    const isActiveQuery = c.req.query("isActive");

    let whereClause = undefined;
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(warehouses.name, `%${search}%`),
          ilike(warehouses.code, `%${search}%`),
          ilike(warehouses.address, `%${search}%`)
        )
      );
    }

    if (isActiveQuery !== undefined) {
      conditions.push(eq(warehouses.isActive, isActiveQuery === "true"));
    }

    if (conditions.length > 0) {
      whereClause = and(...conditions);
    }

    const allWarehouses = await db.query.warehouses.findMany({
      where: whereClause,
      with: {
        locations: {
          orderBy: [desc(locations.createdAt)],
        },
      },
      orderBy: [desc(warehouses.createdAt)],
    });

    const formatted = allWarehouses.map((wh) => ({
      id: wh.id,
      name: wh.name,
      code: wh.code,
      address: wh.address || "",
      isActive: wh.isActive,
      locations: wh.locations.map((loc) => loc.name),
      locationDetails: wh.locations,
      createdAt: wh.createdAt.toISOString(),
      updatedAt: wh.updatedAt.toISOString(),
    }));

    return c.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve warehouses",
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
