import { pool, db } from "../config/db";
import { deliveryOrders, deliveryLines } from "./schema/deliveries.schema";
import { warehouses } from "./schema/warehouses.schema";
import { products } from "./schema/products.schema";
import { users } from "./schema/users.schema";
import { eq } from "drizzle-orm";

export async function seedDeliveries() {
  console.log("📦 Checking delivery orders in database...");
  const existing = await db.select().from(deliveryOrders);
  if (existing.length > 0) {
    console.log(`ℹ️ Delivery orders already exist (${existing.length} found). Skipping seed.`);
    return;
  }

  const defaultUser = await db.query.users.findFirst({
    where: eq(users.isActive, true),
  });
  if (!defaultUser) {
    console.log("No active user found, skipping delivery seed.");
    return;
  }

  const wh = await db.query.warehouses.findFirst({
    where: eq(warehouses.isActive, true),
    with: { locations: true },
  });
  if (!wh || !wh.locations || wh.locations.length === 0) {
    console.log("No active warehouse/location found, skipping delivery seed.");
    return;
  }

  const prods = await db.query.products.findMany({
    where: eq(products.isActive, true),
    limit: 3,
  });
  if (prods.length === 0) {
    console.log("No products found, skipping delivery seed.");
    return;
  }

  const sampleDeliveries = [
    {
      orderNumber: "DEL-2026-0112",
      customerName: "Modern Workspaces Corp",
      customerRef: "PO-MW-882",
      sourceWarehouseId: wh.id,
      sourceLocationId: wh.locations[0]!.id,
      status: "ready" as const,
      notes: "Priority corporate order dispatch.",
      lines: [
        {
          productId: prods[0]!.id,
          qtyOrdered: 10,
          qtyPicked: 10,
          qtyDelivered: 0,
        },
      ],
    },
    {
      orderNumber: "DEL-2026-0115",
      customerName: "Acme Industrial Supplies",
      customerRef: "REQ-9901",
      sourceWarehouseId: wh.id,
      sourceLocationId: wh.locations[wh.locations.length - 1]!.id,
      status: "waiting" as const,
      notes: "Awaiting packaging completion.",
      lines: [
        {
          productId: prods[1]?.id || prods[0]!.id,
          qtyOrdered: 25,
          qtyPicked: 0,
          qtyDelivered: 0,
        },
      ],
    },
    {
      orderNumber: "DEL-2026-0098",
      customerName: "Global Tech Logistics",
      customerRef: "GTL-774",
      sourceWarehouseId: wh.id,
      sourceLocationId: wh.locations[0]!.id,
      status: "done" as const,
      notes: "Completed standard freight delivery.",
      validatedAt: new Date(Date.now() - 86400000 * 2),
      validatedBy: defaultUser.id,
      lines: [
        {
          productId: prods[prods.length - 1]!.id,
          qtyOrdered: 15,
          qtyPicked: 15,
          qtyDelivered: 15,
        },
      ],
    },
  ];

  for (const item of sampleDeliveries) {
    const [inserted] = await db
      .insert(deliveryOrders)
      .values({
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        customerRef: item.customerRef,
        sourceWarehouseId: item.sourceWarehouseId,
        sourceLocationId: item.sourceLocationId,
        status: item.status,
        notes: item.notes,
        validatedAt: item.validatedAt,
        validatedBy: item.validatedBy,
        createdBy: defaultUser.id,
      })
      .returning();

    if (!inserted) continue;

    for (const line of item.lines) {
      await db.insert(deliveryLines).values({
        deliveryId: inserted.id,
        productId: line.productId,
        qtyOrdered: line.qtyOrdered,
        qtyPicked: line.qtyPicked,
        qtyDelivered: line.qtyDelivered,
      });
    }

    console.log(`  ✅ Seeded delivery order: ${item.orderNumber} (${item.status})`);
  }

  console.log("🎉 Delivery orders seed complete!");
}

if (process.argv[1]?.includes("seed-deliveries.ts")) {
  seedDeliveries()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("Failed to seed deliveries:", err);
      await pool.end();
      process.exit(1);
    });
}
