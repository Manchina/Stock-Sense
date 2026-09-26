import { describe, expect, it } from "vitest";
import { HTTPException } from "hono/http-exception";
import {
  recordStockMovement,
  recordStockTransfer,
  recordStockAdjustment,
} from "../../src/lib/ledger";

describe("Stock Ledger Utility Invariant Rules", () => {
  it("should throw error if deltaQty is 0", async () => {
    await expect(
      recordStockMovement({
        productId: "00000000-0000-0000-0000-000000000001",
        locationId: "00000000-0000-0000-0000-000000000002",
        deltaQty: 0,
        sourceType: "receipt",
      })
    ).rejects.toThrow(HTTPException);
  });

  it("should reject transfer if source and destination are identical", async () => {
    const locId = "00000000-0000-0000-0000-000000000002";
    await expect(
      recordStockTransfer({
        productId: "00000000-0000-0000-0000-000000000001",
        fromLocationId: locId,
        toLocationId: locId,
        quantity: 10,
      })
    ).rejects.toThrow(HTTPException);
  });

  it("should reject transfer if quantity is <= 0", async () => {
    await expect(
      recordStockTransfer({
        productId: "00000000-0000-0000-0000-000000000001",
        fromLocationId: "00000000-0000-0000-0000-000000000002",
        toLocationId: "00000000-0000-0000-0000-000000000003",
        quantity: -5,
      })
    ).rejects.toThrow(HTTPException);
  });

  it("should reject adjustment if countedQuantity is negative", async () => {
    await expect(
      recordStockAdjustment({
        productId: "00000000-0000-0000-0000-000000000001",
        locationId: "00000000-0000-0000-0000-000000000002",
        countedQuantity: -1,
      })
    ).rejects.toThrow(HTTPException);
  });
});
