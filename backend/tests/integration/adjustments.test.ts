import { describe, expect, it } from "vitest";
import app from "../../src/index";

describe("Stock Adjustments Module Integration Tests", () => {
  const timestamp = Date.now();
  let createdAdjustmentId: string;
  let testProductId: string;

  it("should ensure a test product exists for adjustment testing", async () => {
    const res = await app.request("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Adjustment Test Item ${timestamp}`,
        sku: `ADJ-SKU-${timestamp}`,
        initialStock: 50,
        initialLocation: "WH-MAIN / Rack A",
      }),
    });

    const body = (await res.json()) as any;
    expect(res.status).toBe(201);
    testProductId = body.data.id;
  });

  it("POST /api/v1/adjustments - should create a draft adjustment", async () => {
    const res = await app.request("/api/v1/adjustments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "WH-MAIN / Rack A",
        reason: "Physical inventory audit count",
        status: "draft",
        items: [
          {
            productId: testProductId,
            countedQty: 45, // Discrepancy of -5
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe("draft");
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].deltaQty).toBe(-5);
    createdAdjustmentId = body.data.id;
  });

  it("GET /api/v1/adjustments - should list adjustments including the created one", async () => {
    const res = await app.request("/api/v1/adjustments", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.find((a: any) => a.id === createdAdjustmentId);
    expect(found).toBeDefined();
    expect(found.status).toBe("draft");
  });

  it("GET /api/v1/adjustments/:id - should get adjustment details by ID", async () => {
    const res = await app.request(`/api/v1/adjustments/${createdAdjustmentId}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdAdjustmentId);
    expect(body.data.items.length).toBe(1);
  });

  it("PUT /api/v1/adjustments/:id - should apply adjustment and update stock ledger on done status", async () => {
    const res = await app.request(`/api/v1/adjustments/${createdAdjustmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "done",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("done");
    expect(body.data.appliedAt).toBeDefined();
  });
});
