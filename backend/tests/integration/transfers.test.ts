import { describe, expect, it } from "vitest";
import app from "../../src/index";

describe("Internal Transfers Module Integration Tests", () => {
  const timestamp = Date.now();
  let createdTransferId: string;
  let testProductId: string;

  it("should ensure a test product exists for transfer testing", async () => {
    const res = await app.request("/api/v1/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Transfer Widget ${timestamp}`,
        sku: `TRF-${timestamp}`,
        initialStock: 100,
        initialLocation: "WH-MAIN / Rack A",
      }),
    });

    const body = (await res.json()) as any;
    expect(res.status).toBe(201);
    testProductId = body.data.id;
  });

  it("POST /api/v1/transfers - should create a draft transfer", async () => {
    const res = await app.request("/api/v1/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLocation: "WH-MAIN / Rack A",
        destinationLocation: "WH-PROD / Production Floor",
        status: "draft",
        notes: "Move raw stock for assembly line test",
        items: [
          {
            productId: testProductId,
            quantity: 20,
          },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe("draft");
    expect(body.data.transferNumber).toBeDefined();
    expect(body.data.items.length).toBe(1);
    expect(body.data.items[0].quantity).toBe(20);
    createdTransferId = body.data.id;
  });

  it("GET /api/v1/transfers - should list transfers including the created one", async () => {
    const res = await app.request("/api/v1/transfers", {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    const found = body.data.find((t: any) => t.id === createdTransferId);
    expect(found).toBeDefined();
    expect(found.status).toBe("draft");
  });

  it("GET /api/v1/transfers/:id - should get transfer details by ID", async () => {
    const res = await app.request(`/api/v1/transfers/${createdTransferId}`, {
      method: "GET",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdTransferId);
    expect(body.data.items.length).toBe(1);
  });

  it("PUT /api/v1/transfers/:id - should update transfer status to ready", async () => {
    const res = await app.request(`/api/v1/transfers/${createdTransferId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ready",
        notes: "Items staged and ready for transfer",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ready");
    expect(body.data.notes).toBe("Items staged and ready for transfer");
  });

  it("PUT /api/v1/transfers/:id - should execute stock transfer on done status", async () => {
    const res = await app.request(`/api/v1/transfers/${createdTransferId}`, {
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
    expect(body.data.validatedAt).toBeDefined();
  });

  it("POST /api/v1/transfers - should reject transfer when source and destination are identical", async () => {
    const res = await app.request("/api/v1/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLocation: "WH-MAIN / Rack A",
        destinationLocation: "WH-MAIN / Rack A",
        status: "draft",
        items: [{ productId: testProductId, quantity: 5 }],
      }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
  });
});
