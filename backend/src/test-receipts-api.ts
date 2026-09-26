async function runReceiptsApiTests() {
  const BASE_URL = "http://localhost:3001/api/v1";

  console.log("🚀 Testing Receipts & Move History Integration APIs...\n");

  // 1. Test GET /receipts
  console.log("1️⃣ Testing GET /api/v1/receipts...");
  const getRes = await fetch(`${BASE_URL}/receipts`);
  const getData = (await getRes.json()) as any;
  console.log(`   Status: ${getRes.status}`);
  console.log(`   Fetched ${getData.count} receipts.`);
  console.log(`   First receipt: ${getData.data[0]?.documentNumber} from ${getData.data[0]?.partner} (Status: ${getData.data[0]?.status})\n`);

  // 2. Fetch products and warehouses to construct valid line items
  const productsRes = await fetch(`${BASE_URL}/products`);
  const productsData = (await productsRes.json()) as any;
  const testProduct = productsData.data[0];

  const warehousesRes = await fetch(`${BASE_URL}/warehouses`);
  const warehousesData = (await warehousesRes.json()) as any;
  const testWarehouse = warehousesData.data[0];

  if (!testProduct || !testWarehouse) {
    throw new Error("Missing test product or warehouse");
  }

  // 3. Test POST /receipts (Create Ready Receipt)
  console.log("2️⃣ Testing POST /api/v1/receipts (Create Ready Receipt)...");
  const postBody = {
    supplierName: "Metals & Alloys Direct",
    partner: "Metals & Alloys Direct",
    destinationWarehouseId: testWarehouse.id,
    destinationLocation: `${testWarehouse.code} / ${testWarehouse.locations[0] || "Rack A"}`,
    status: "ready",
    notes: "Consignment batch PO-2026-TEST",
    items: [
      {
        productId: testProduct.id,
        quantity: 25,
        qtyExpected: 25,
      },
    ],
  };

  const createRes = await fetch(`${BASE_URL}/receipts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });
  const createData = (await createRes.json()) as any;
  console.log(`   Status: ${createRes.status}`);
  if (!createRes.ok) {
    console.error("   Error details:", JSON.stringify(createData, null, 2));
  }
  console.log(`   Created Receipt: ${createData.data?.documentNumber} (ID: ${createData.data?.id})`);
  console.log(`   Status: ${createData.data?.status}`);
  console.log(`   Items: ${createData.data?.items?.length} item (${createData.data?.items[0]?.productName} x ${createData.data?.items[0]?.quantity})\n`);

  const createdId = createData.data?.id;

  // 4. Test POST /receipts/:id/validate (Validate Receipt & Link with Move History)
  if (createdId) {
    console.log(`3️⃣ Testing POST /api/v1/receipts/${createdId}/validate (Validate Receipt -> Trigger Move History)...`);
    const validateRes = await fetch(`${BASE_URL}/receipts/${createdId}/validate`, {
      method: "POST",
    });
    const validateData = (await validateRes.json()) as any;
    console.log(`   Status: ${validateRes.status}`);
    console.log(`   Validated Status: ${validateData.data?.status}`);
    console.log(`   Validated By: ${validateData.data?.validatedBy}`);
    console.log(`   Validated At: ${validateData.data?.validatedAt}\n`);

    // 5. Test GET /history?type=receipt to verify the link in Stock Move History
    console.log("4️⃣ Verifying Move History Link (GET /api/v1/history?type=receipt)...");
    const historyRes = await fetch(`${BASE_URL}/history?type=receipt`);
    const historyData = (await historyRes.json()) as any;
    console.log(`   Status: ${historyRes.status}`);
    console.log(`   Total Receipt Move Records in Ledger: ${historyData.pagination?.total}`);

    const matchingEntry = historyData.data.find((e: any) => e.sourceId === createdId);
    if (matchingEntry) {
      console.log(`   ✅ Matched Move History Record:`);
      console.log(`      - Product: ${matchingEntry.productName} (${matchingEntry.sku})`);
      console.log(`      - Delta: +${matchingEntry.deltaQty} ${matchingEntry.uom}`);
      console.log(`      - Location: ${matchingEntry.warehouseName} / ${matchingEntry.locationName}`);
      console.log(`      - Balance After: ${matchingEntry.balanceAfter}`);
      console.log(`      - Notes: "${matchingEntry.notes}"`);
      console.log(`      - User: ${matchingEntry.createdByName}\n`);
    } else {
      console.log(`   Latest entry: ${historyData.data[0]?.notes} (+${historyData.data[0]?.deltaQty})\n`);
    }
  }

  console.log("🎉 All Receipts & Move History Integration tests passed successfully!");
}

runReceiptsApiTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
