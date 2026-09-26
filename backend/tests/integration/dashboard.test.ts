import { describe, expect, it } from "vitest";
import app from "../../src/index";

describe("Dashboard Module Integration Tests", () => {
  it(
    "GET /api/v1/dashboard/stats - should return accurate real-time inventory KPIs and breakdown",
    async () => {
      const res = await app.request("/api/v1/dashboard/stats", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      // Verify KPI numbers
      expect(typeof body.data.totalProducts).toBe("number");
      expect(body.data.totalProducts).toBeGreaterThanOrEqual(1);

      expect(typeof body.data.lowStockCount).toBe("number");
      expect(typeof body.data.pendingReceipts).toBe("number");
      expect(typeof body.data.pendingDeliveries).toBe("number");
      expect(typeof body.data.scheduledTransfers).toBe("number");
      expect(typeof body.data.totalOperations).toBe("number");
      expect(typeof body.data.monthLabel).toBe("string");

      // Verify activity breakdown array
      expect(Array.isArray(body.data.activityBreakdown)).toBe(true);
      expect(body.data.activityBreakdown.length).toBe(4);

      const types = body.data.activityBreakdown.map((b: any) => b.type);
      expect(types).toContain("receipt");
      expect(types).toContain("delivery");
      expect(types).toContain("internal");
      expect(types).toContain("adjustment");
    },
    15000
  );

  it(
    "GET /api/v1/dashboard/operations - should return unified list of operations",
    async () => {
      const res = await app.request("/api/v1/dashboard/operations", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.total).toBe("number");

      if (body.data.length > 0) {
        const op = body.data[0];
        expect(op.id).toBeDefined();
        expect(op.documentNumber).toBeDefined();
        expect(["receipt", "delivery", "internal", "adjustment"]).toContain(op.type);
        expect(op.status).toBeDefined();
        expect(Array.isArray(op.items)).toBe(true);
      }
    },
    15000
  );

  it(
    "GET /api/v1/dashboard/operations?docType=internal - should filter by internal transfers",
    async () => {
      const res = await app.request("/api/v1/dashboard/operations?docType=internal", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      body.data.forEach((op: any) => {
        expect(op.type).toBe("internal");
      });
    },
    15000
  );

  it(
    "GET /api/v1/dashboard/operations?status=done - should filter by status done",
    async () => {
      const res = await app.request("/api/v1/dashboard/operations?status=done", {
        method: "GET",
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      body.data.forEach((op: any) => {
        expect(op.status).toBe("done");
      });
    },
    15000
  );
});
