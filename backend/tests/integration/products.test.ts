import { describe, expect, it } from "vitest";
import app from "../../src/index";

describe("Products & Categories Module Integration Tests", () => {
  const timestamp = Date.now();
  const testCategoryName = `Test Category ${timestamp}`;
  let createdCategoryId: string;

  const testProductSku = `SKU-TST-${timestamp}`;
  let createdProductId: string;

  it("POST /api/v1/categories - should create a new category", async () => {
    const res = await app.request("/api/v1/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testCategoryName,
        description: "Integration test created category",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(testCategoryName);
    expect(body.data.slug).toBeDefined();
    createdCategoryId = body.data.id;
  });

  it("GET /api/v1/categories - should list categories including the created one", async () => {
    const res = await app.request("/api/v1/categories", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.find((c: any) => c.id === createdCategoryId);
    expect(found).toBeDefined();
    expect(found.name).toBe(testCategoryName);
  });

  it("POST /api/v1/products - should create a product successfully without initial stock", async () => {
    const res = await app.request("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Standard Test Widget",
        sku: testProductSku,
        categoryId: createdCategoryId,
        uom: "Units (pcs)",
        reorderPoint: 15,
        reorderQty: 50,
        description: "A test widget created during integration testing",
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.sku).toBe(testProductSku);
    expect(body.data.name).toBe("Standard Test Widget");
    expect(body.data.currentStock).toBe(0);
    expect(body.data.minStockAlert).toBe(15);
    expect(body.data.category).toBe(testCategoryName);
    createdProductId = body.data.id;
  });

  it("POST /api/v1/products - should reject duplicate SKU with 409 Conflict", async () => {
    const res = await app.request("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate SKU Widget",
        sku: testProductSku,
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.message).toContain("already exists");
  });

  it("POST /api/v1/products - should create product with initial stock and atomic ledger movement", async () => {
    const initialSku = `SKU-INIT-${timestamp}`;
    const initialQty = 75;

    const res = await app.request("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pre-Stocked Valve Assembly",
        sku: initialSku,
        category: testCategoryName,
        unitOfMeasure: "Kilograms (kg)",
        initialStock: initialQty,
        minStockAlert: 20,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.currentStock).toBe(initialQty);
    expect(body.data.sku).toBe(initialSku);

    // Verify locationStock map contains the initial allocation
    expect(Object.keys(body.data.locationStock).length).toBeGreaterThan(0);
    const firstAllocated = Object.values(body.data.locationStock)[0];
    expect(firstAllocated).toBe(initialQty);
  });

  it("GET /api/v1/products - should list products and support search filter", async () => {
    const res = await app.request(`/api/v1/products?search=${testProductSku}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].sku).toBe(testProductSku);
  });

  it("GET /api/v1/products/:id - should retrieve product by ID with full details", async () => {
    const res = await app.request(`/api/v1/products/${createdProductId}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdProductId);
    expect(body.data.sku).toBe(testProductSku);
    expect(body.data.category).toBe(testCategoryName);
  });

  it("GET /api/v1/products/:id/stock - should return per-location stock breakdown", async () => {
    const res = await app.request(`/api/v1/products/${createdProductId}/stock`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.productId).toBe(createdProductId);
    expect(Array.isArray(body.data.locations)).toBe(true);
  });

  it("PUT /api/v1/products/:id - should update product master details", async () => {
    const updatedName = "Updated Test Widget (Rev 2)";
    const res = await app.request(`/api/v1/products/${createdProductId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: updatedName,
        minStockAlert: 25,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe(updatedName);
    expect(body.data.minStockAlert).toBe(25);
  });

  it("GET /api/v1/products/alerts/low-stock - should list items at or below reorder point", async () => {
    const res = await app.request("/api/v1/products/alerts/low-stock", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // Our created product has 0 stock and minStockAlert=25, so it must be in the low stock list
    const found = body.data.find((p: any) => p.id === createdProductId);
    expect(found).toBeDefined();
  });

  it("DELETE /api/v1/products/:id - should delete or deactivate product", async () => {
    const res = await app.request(`/api/v1/products/${createdProductId}`, {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
  }, 15000);
});
