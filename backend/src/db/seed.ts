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
