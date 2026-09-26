import { pool, db } from "../config/db";
import { warehouses, locations } from "./schema/warehouses.schema";
import { eq } from "drizzle-orm";

const initialWarehousesData = [
  {
    name: "Main Central Warehouse",
    code: "WH-MAIN",
    address: "100 Logistics Blvd, Industrial Zone",
    isActive: true,
    locations: ["Receiving Bay", "Rack A", "Rack B", "Rack C", "Packing Zone"],
  },
  {
    name: "Production Facility Store",
    code: "WH-PROD",
    address: "45 Assembly Rd, Unit 2",
    isActive: true,
    locations: ["Production Floor", "Raw Stock Buffer", "Finished Goods Staging"],
  },
  {
    name: "Regional Distribution Center",
    code: "WH-DIST",
    address: "88 Express Highway, North Port",
    isActive: true,
    locations: ["Aisle 1", "Aisle 2", "Dispatch Bay"],
  },
];

export async function seedWarehouses() {
  console.log("🌱 Seeding static warehouse data...");

  for (const whData of initialWarehousesData) {
    const existing = await db.query.warehouses.findFirst({
      where: eq(warehouses.code, whData.code),
    });

    if (!existing) {
      const [newWh] = await db
        .insert(warehouses)
        .values({
          name: whData.name,
          code: whData.code,
          address: whData.address,
          isActive: whData.isActive,
        })
        .returning();

      if (!newWh) {
        throw new Error(`Failed to insert warehouse: ${whData.name}`);
      }

      console.log(`  ➕ Inserted warehouse: ${newWh.name} (${newWh.code})`);

      const locs = whData.locations.map((locName, idx) => ({
        warehouseId: newWh.id,
        name: locName,
        code: `${whData.code}-LOC-${idx + 1}`,
        type: "storage",
        isActive: true,
      }));

      await db.insert(locations).values(locs);
      console.log(`     Added ${locs.length} locations`);
    } else {
      console.log(`  ℹ️ Warehouse already exists: ${existing.name} (${existing.code})`);
    }
  }

  console.log("✅ Warehouse seeding completed successfully!");
}

async function main() {
  try {
    await seedWarehouses();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// If run directly via tsx
if (process.argv[1]?.includes("seed") || import.meta.url.includes("seed")) {
  main();
}
