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
import { eq } from "drizzle-orm";
import { db, pool } from "../config/db";
import { locations, users, warehouses } from "./schema";
import { hashPassword } from "../lib/password";

export async function seed() {
  console.log("🌱 Starting StockSense database seeding...");

  // 1. Seed Demo Users
  const defaultPassword = "password123";
  const hashedPassword = await hashPassword(defaultPassword);

  const demoUsers = [
    {
      name: "Inventory Manager",
      email: "manager@stocksense.io",
      role: "inventory_manager" as const,
      passwordHash: hashedPassword,
    },
    {
      name: "Warehouse Staff",
      email: "staff@stocksense.io",
      role: "warehouse_staff" as const,
      passwordHash: hashedPassword,
    },
    {
      name: "Sarah Connor",
      email: "sarah.connor@stocksense.io",
      role: "inventory_manager" as const,
      passwordHash: hashedPassword,
    },
    {
      name: "Alex Miller",
      email: "alex.miller@stocksense.io",
      role: "warehouse_staff" as const,
      passwordHash: hashedPassword,
    },
  ];

  for (const u of demoUsers) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, u.email),
    });

    if (!existing) {
      await db.insert(users).values({
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: true,
      });
      console.log(`  ✅ User seeded: ${u.email} (${u.role})`);
    } else {
      console.log(`  ℹ️ User already exists: ${u.email}`);
    }
  }

  // 2. Seed Default Warehouses & Locations if not present
  const existingWarehouses = await db.select().from(warehouses);
  if (existingWarehouses.length === 0) {
    const [wh1] = await db
      .insert(warehouses)
      .values({
        name: "Main Warehouse (WH-01)",
        code: "WH-01",
        address: "100 Industrial Parkway, Sector 4",
      })
      .returning();

    const [wh2] = await db
      .insert(warehouses)
      .values({
        name: "Secondary Warehouse (WH-02)",
        code: "WH-02",
        address: "45 Logistics Boulevard, Dock 12",
      })
      .returning();

    console.log("  ✅ Warehouses seeded: WH-01, WH-02");

    if (wh1 && wh2) {
      await db.insert(locations).values([
        { warehouseId: wh1.id, name: "Main Store (Rack A1)", code: "LOC-A1", type: "storage" },
        { warehouseId: wh1.id, name: "Production Rack (Rack B1)", code: "LOC-B1", type: "production" },
        { warehouseId: wh1.id, name: "Dispatch Bay (Bay 1)", code: "BAY-01", type: "dispatch" },
        { warehouseId: wh2.id, name: "Bulk Storage (Zone C)", code: "LOC-C1", type: "storage" },
      ]);
      console.log("  ✅ Locations seeded for WH-01 and WH-02");
    }
  } else {
    console.log(`  ℹ️ Warehouses already exist (${existingWarehouses.length} found)`);
  }

  console.log("🎉 Seeding complete!");
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("❌ Seeding failed:", err);
      await pool.end();
      process.exit(1);
    });
}
