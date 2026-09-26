import { eq } from "drizzle-orm";
import { pool, db } from "../config/db";
import { warehouses, locations } from "./schema/warehouses.schema";
import { users } from "./schema/users.schema";
import { hashPassword } from "../lib/password";

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

  // 2. Seed Warehouses & Locations
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

  console.log("🎉 Seeding complete!");
}

async function main() {
  try {
    await seed();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

if (process.argv[1]?.includes("seed") || import.meta.url.includes("seed")) {
  main();
}
