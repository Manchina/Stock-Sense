interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  count?: number;
  data?: T;
}

async function runApiTests() {
  const BASE_URL = "http://localhost:3001/api/v1/warehouses";

  console.log("🚀 Testing Warehouse APIs...\n");

  // 1. Test GET all warehouses
  console.log("1️⃣ Testing GET /api/v1/warehouses...");
  const getRes = await fetch(BASE_URL);
  const getData = (await getRes.json()) as ApiResponse<any[]>;
  console.log(`   Status: ${getRes.status}`);
  console.log(`   Fetched ${getData.count} warehouses.`);
  console.log(
    `   First warehouse: ${getData.data?.[0]?.name} (${getData.data?.[0]?.code}) with ${getData.data?.[0]?.locations?.length} locations\n`
  );

  // 2. Test POST create warehouse
  console.log("2️⃣ Testing POST /api/v1/warehouses (Create new warehouse)...");
  const postBody = {
    name: "East Coast Logistics Hub",
    code: `WH-EAST-${Date.now().toString().slice(-4)}`,
    address: "770 Port Blvd, Newark, NJ",
    isActive: true,
    locations: ["Dock 1", "Aisle E1", "Aisle E2", "Cold Bay 1", "Quarantine Zone"],
  };

  const postRes = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(postBody),
  });
  const postData = (await postRes.json()) as ApiResponse<any>;
  console.log(`   Status: ${postRes.status}`);
  console.log(`   Created Warehouse ID: ${postData.data?.id}`);
  console.log(`   Name: ${postData.data?.name}`);
  console.log(`   Code: ${postData.data?.code}`);
  console.log(`   Locations: ${JSON.stringify(postData.data?.locations)}\n`);

  const createdId = postData.data?.id;

  // 3. Test PUT update warehouse
  if (createdId) {
    console.log(`3️⃣ Testing PUT /api/v1/warehouses/${createdId} (Update warehouse)...`);
    const putBody = {
      name: "East Coast Super Hub & Distribution",
      address: "880 Port Express Blvd, Newark, NJ",
      locations: ["Dock 1", "Dock 2 (Expanded)", "Aisle E1", "Aisle E2", "Aisle E3", "Cold Storage Zone"],
    };

    const putRes = await fetch(`${BASE_URL}/${createdId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(putBody),
    });
    const putData = (await putRes.json()) as ApiResponse<any>;
    console.log(`   Status: ${putRes.status}`);
    console.log(`   Updated Name: ${putData.data?.name}`);
    console.log(`   Updated Address: ${putData.data?.address}`);
    console.log(`   Updated Locations (${putData.data?.locations?.length}): ${JSON.stringify(putData.data?.locations)}\n`);

    // 4. Test GET single warehouse
    console.log(`4️⃣ Testing GET /api/v1/warehouses/${createdId} (Get by ID)...`);
    const getSingleRes = await fetch(`${BASE_URL}/${createdId}`);
    const getSingleData = (await getSingleRes.json()) as ApiResponse<any>;
    console.log(`   Status: ${getSingleRes.status}`);
    console.log(`   Warehouse Code: ${getSingleData.data?.code}`);
    console.log(`   Warehouse Name: ${getSingleData.data?.name}`);
    console.log(`   Location details count: ${getSingleData.data?.locationDetails?.length}\n`);
  }

  console.log("🎉 All Warehouse API tests completed successfully!");
}

runApiTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
