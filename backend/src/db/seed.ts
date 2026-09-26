import { eq } from "drizzle-orm";
import { pool, db } from "../config/db";
import { warehouses, locations } from "./schema/warehouses.schema";
import { categories } from "./schema/categories.schema";
import { products } from "./schema/products.schema";
import { receipts, receiptLines } from "./schema/receipts.schema";
import { users } from "./schema/users.schema";
import { hashPassword } from "../lib/password";
import { executeStockMovement } from "../services/stock.service";

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

const initialCategoriesData = [
  { name: "Raw Materials", slug: "raw-materials", description: "Primary materials for fabrication and manufacturing" },
  { name: "Finished Goods", slug: "finished-goods", description: "Ready-to-ship completed commercial inventory" },
  { name: "Components & Fasteners", slug: "components-fasteners", description: "Bolts, brackets, ICs, and mechanical hardware" },
  { name: "Packaging", slug: "packaging", description: "Cartons, protective wraps, and shipping containers" },
  { name: "Tools & Equipment", slug: "tools-equipment", description: "Operational hand tools and machinery" },
  { name: "Electronics", slug: "electronics", description: "Printed circuits, power supplies, and sensors" },
];

export async function seed() {
  console.log("🌱 Starting StockSense database seeding...");

  // Ensure PostgreSQL enum type includes super_admin
  try {
    await pool.query(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'super_admin';`);
  } catch (err: any) {
    console.log("  ℹ️ Enum alter note:", err?.message || err);
  }

  // 1. Seed Demo Users
  const defaultPassword = "password123";
  const hashedPassword = await hashPassword(defaultPassword);

  const demoUsers = [
    {
      name: "Super Admin",
      email: "admin@stocksense.io",
      role: "super_admin" as const,
      passwordHash: hashedPassword,
    },
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

  let managerUserId: string | null = null;
  for (const u of demoUsers) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, u.email),
    });

    if (!existing) {
      const [inserted] = await db
        .insert(users)
        .values({
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: u.passwordHash,
          isActive: true,
        })
        .returning();
      console.log(`  ✅ User seeded: ${u.email} (${u.role})`);
      if (inserted && u.role === "inventory_manager" && !managerUserId) {
        managerUserId = inserted.id;
      }
    } else {
      // Update password hash and role to guarantee credentials
      await db
        .update(users)
        .set({ passwordHash: u.passwordHash, role: u.role, isActive: true })
        .where(eq(users.id, existing.id));
      console.log(`  🔄 User refreshed: ${u.email} (${u.role})`);
      if (u.role === "inventory_manager" && !managerUserId) {
        managerUserId = existing.id;
      }
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
        throw new Error(`Failed to insert warehouse ${whData.name}`);
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

  // 3. Seed Categories
  const categoryMap = new Map<string, string>();
  for (const catData of initialCategoriesData) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.slug, catData.slug),
    });

    if (!existing) {
      const [newCat] = await db
        .insert(categories)
        .values({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          isActive: true,
        })
        .returning();

      if (!newCat) {
        throw new Error(`Failed to insert category ${catData.name}`);
      }

      categoryMap.set(catData.name, newCat.id);
      console.log(`  ✅ Category seeded: ${newCat.name}`);
    } else {
      categoryMap.set(catData.name, existing.id);
      console.log(`  ℹ️ Category already exists: ${existing.name}`);
    }
  }

  // 4. Seed Initial Products if none exist
  const existingProducts = await db.select().from(products);
  if (existingProducts.length === 0) {
    const targetLoc = await db.query.locations.findFirst({
      where: eq(locations.isActive, true),
    });

    const demoProducts = [
      {
        name: "Steel Rods (12mm)",
        sku: "RAW-STL-12MM",
        categoryName: "Raw Materials",
        uom: "Kilograms (kg)",
        initialStock: 450,
        reorderPoint: 100,
        reorderQty: 200,
        description: "High tensile carbon steel construction rods.",
      },
      {
        name: "Ergonomic Office Chair",
        sku: "FGD-CHR-ERG",
        categoryName: "Finished Goods",
        uom: "Units (pcs)",
        initialStock: 24,
        reorderPoint: 30,
        reorderQty: 50,
        description: "Adjustable mesh chair with lumbar support.",
      },
      {
        name: "Hex Flange Bolts (M8x25)",
        sku: "CMP-BLT-M8",
        categoryName: "Components & Fasteners",
        uom: "Boxes (box)",
        initialStock: 120,
        reorderPoint: 40,
        reorderQty: 100,
        description: "Zinc-plated grade 8.8 structural hex flange bolts.",
      },
    ];

    for (const p of demoProducts) {
      const catId = categoryMap.get(p.categoryName) || null;

      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(products)
          .values({
            name: p.name,
            sku: p.sku,
            description: p.description,
            categoryId: catId,
            uom: p.uom,
            reorderPoint: p.reorderPoint,
            reorderQty: p.reorderQty,
            isActive: true,
          })
          .returning();

        if (inserted && targetLoc && p.initialStock > 0) {
          await executeStockMovement(tx, {
            productId: inserted.id,
            locationId: targetLoc.id,
            deltaQty: p.initialStock,
            sourceType: "initial_inventory",
            notes: "Seed initialization stock",
            userId: managerUserId,
          });
        }
      });

      console.log(`  ✅ Product seeded: ${p.name} (${p.sku}) with ${p.initialStock} ${p.uom}`);
    }
  } else {
    console.log(`  ℹ️ Products already exist (${existingProducts.length} found)`);
  }

  // 5. Seed Initial Receipts if none exist
  const existingReceipts = await db.select().from(receipts);
  if (existingReceipts.length === 0) {
    const allProds = await db.select().from(products);
    const allWarehouses = await db.query.warehouses.findMany({ with: { locations: true } });
    const mainWh = allWarehouses.find((w) => w.code === "WH-MAIN") || allWarehouses[0];
    const prodWh = allWarehouses.find((w) => w.code === "WH-PROD") || allWarehouses[0];

    const rackA = mainWh?.locations.find((l) => l.name.includes("Rack A")) || mainWh?.locations[0];
    const rackB = mainWh?.locations.find((l) => l.name.includes("Rack B")) || mainWh?.locations[0];
    const stagingLoc = prodWh?.locations.find((l) => l.name.includes("Finished Goods")) || prodWh?.locations[0];

    const steelProd = allProds.find((p) => p.sku === "RAW-STL-12MM") || allProds[0];
    const boltProd = allProds.find((p) => p.sku === "CMP-BLT-M8") || allProds[0];
    const chairProd = allProds.find((p) => p.sku === "FGD-CHR-ERG") || allProds[0];

    if (mainWh && rackA && steelProd && managerUserId) {
      // 5.1 Validated Receipt (done -> stock movement credited in ledger & visible in Move History)
      await db.transaction(async (tx) => {
        const [rec1] = await tx
          .insert(receipts)
          .values({
            receiptNumber: "REC-2026-0001",
            supplierName: "Apex Steel Industries",
            destinationWarehouseId: mainWh.id,
            destinationLocationId: rackA.id,
            status: "done",
            notes: "Inbound raw materials shipment PO-8821",
            expectedDate: new Date("2026-02-10T10:00:00Z"),
            validatedAt: new Date("2026-02-10T10:30:00Z"),
            validatedBy: managerUserId,
            createdBy: managerUserId,
          })
          .returning();

        if (rec1) {
          await tx.insert(receiptLines).values({
            receiptId: rec1.id,
            productId: steelProd.id,
            qtyExpected: 50,
            qtyReceived: 50,
          });

          await executeStockMovement(tx, {
            productId: steelProd.id,
            locationId: rackA.id,
            deltaQty: 50,
            sourceType: "receipt",
            sourceId: rec1.id,
            notes: `Receipt REC-2026-0001 from Apex Steel Industries`,
            userId: managerUserId,
          });
        }
      });
      console.log("  ✅ Seeded Validated Receipt: REC-2026-0001 (+50 Steel Rods in Ledger)");
    }

    if (mainWh && rackB && boltProd && managerUserId) {
      // 5.2 Ready Receipt
      await db.transaction(async (tx) => {
        const [rec2] = await tx
          .insert(receipts)
          .values({
            receiptNumber: "REC-2026-0002",
            supplierName: "Global Hardware Supplies",
            destinationWarehouseId: mainWh.id,
            destinationLocationId: rackB.id,
            status: "ready",
            notes: "Fasteners restock batch for assembly line",
            expectedDate: new Date("2026-03-01T09:00:00Z"),
            createdBy: managerUserId,
          })
          .returning();

        if (rec2) {
          await tx.insert(receiptLines).values({
            receiptId: rec2.id,
            productId: boltProd.id,
            qtyExpected: 200,
            qtyReceived: 0,
          });
        }
      });
      console.log("  ✅ Seeded Ready Receipt: REC-2026-0002");
    }

    if (prodWh && stagingLoc && chairProd && managerUserId) {
      // 5.3 Waiting Receipt
      await db.transaction(async (tx) => {
        const [rec3] = await tx
          .insert(receipts)
          .values({
            receiptNumber: "REC-2026-0003",
            supplierName: "Comfort Seating Corp",
            destinationWarehouseId: prodWh.id,
            destinationLocationId: stagingLoc.id,
            status: "waiting",
            notes: "Office furniture consignment delivery",
            expectedDate: new Date("2026-03-15T14:00:00Z"),
            createdBy: managerUserId,
          })
          .returning();

        if (rec3) {
          await tx.insert(receiptLines).values({
            receiptId: rec3.id,
            productId: chairProd.id,
            qtyExpected: 15,
            qtyReceived: 0,
          });
        }
      });
      console.log("  ✅ Seeded Waiting Receipt: REC-2026-0003");
    }
  } else {
    console.log(`  ℹ️ Receipts already exist (${existingReceipts.length} found)`);
  }

  console.log("🎉 Seeding complete!");
}

// Auto-run if executed directly via tsx
if (
  process.argv[1]?.includes("seed.ts") ||
  import.meta.url.includes("seed.ts")
) {
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
