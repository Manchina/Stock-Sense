import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../config/db";
import { stockLevels } from "../db/schema/stock-levels.schema";
import { stockLedger } from "../db/schema/ledger.schema";
import type { StockLedgerEntry, StockLevel } from "../db/schema/index";

export type LedgerSourceType =
  | "receipt"
  | "delivery"
  | "transfer"
  | "adjustment"
  | "initial_inventory";

export interface StockMovementInput {
  productId: string;
  locationId: string;
  deltaQty: number; // Positive = IN (+), Negative = OUT (-)
  sourceType: LedgerSourceType;
  sourceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  allowNegativeStock?: boolean;
}

export interface StockTransferInput {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number; // Positive amount being transferred
  transferId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  allowNegativeStock?: boolean;
}

export interface StockAdjustmentInput {
  productId: string;
  locationId: string;
  countedQuantity: number; // Physical count
  adjustmentId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface StockMovementResult {
  stockLevel: StockLevel;
  ledgerEntry: StockLedgerEntry;
}

// Type for a Drizzle database transaction or db instance
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Inserts a single stock movement into the immutable stock_ledger and updates the stock_levels atomically.
 * Ensures strict balance math: balanceAfter = currentBalance + deltaQty.
 * Throws HTTPException(400) if a deduction would cause negative stock and allowNegativeStock is false.
 */
export async function recordStockMovement(
  input: StockMovementInput,
  client: DbOrTx = db
): Promise<StockMovementResult> {
  const {
    productId,
    locationId,
    deltaQty,
    sourceType,
    sourceId = null,
    notes = null,
    createdBy = null,
    allowNegativeStock = false,
  } = input;

  if (deltaQty === 0) {
    throw new HTTPException(400, {
      message: "Stock movement delta quantity cannot be zero.",
    });
  }

  // Find existing stock level record for this product & location
  const [existingLevel] = await client
    .select()
    .from(stockLevels)
    .where(
      and(
        eq(stockLevels.productId, productId),
        eq(stockLevels.locationId, locationId)
      )
    )
    .limit(1);

  const currentQty = existingLevel ? existingLevel.quantity : 0;
  const newBalance = currentQty + deltaQty;

  if (newBalance < 0 && !allowNegativeStock) {
    throw new HTTPException(400, {
      message: `Insufficient stock at location. Available: ${currentQty}, Required: ${Math.abs(deltaQty)}.`,
    });
  }

  let updatedStockLevel: StockLevel | undefined;

  if (existingLevel) {
    const updated = await client
      .update(stockLevels)
      .set({
        quantity: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(stockLevels.id, existingLevel.id))
      .returning();
    updatedStockLevel = updated[0];
  } else {
    const created = await client
      .insert(stockLevels)
      .values({
        productId,
        locationId,
        quantity: newBalance,
        updatedAt: new Date(),
      })
      .returning();
    updatedStockLevel = created[0];
  }

  if (!updatedStockLevel) {
    throw new HTTPException(500, {
      message: "Failed to update stock level record.",
    });
  }

  // Append entry to the immutable stock ledger
  const insertedLedger = await client
    .insert(stockLedger)
    .values({
      productId,
      locationId,
      deltaQty,
      sourceType,
      sourceId: sourceId || null,
      balanceAfter: newBalance,
      notes: notes || null,
      createdBy: createdBy || null,
    })
    .returning();

  const ledgerEntry = insertedLedger[0];
  if (!ledgerEntry) {
    throw new HTTPException(500, {
      message: "Failed to append immutable stock ledger entry.",
    });
  }

  return {
    stockLevel: updatedStockLevel,
    ledgerEntry,
  };
}

/**
 * Records multiple stock movements inside a single atomic transaction.
 * If any line fails (e.g. insufficient stock), the entire batch rolls back.
 */
export async function recordStockMovements(
  movements: StockMovementInput[],
  client?: DbOrTx
): Promise<StockMovementResult[]> {
  const runner = async (tx: DbOrTx) => {
    const results: StockMovementResult[] = [];
    for (const mov of movements) {
      const res = await recordStockMovement(mov, tx);
      results.push(res);
    }
    return results;
  };

  if (client) {
    return await runner(client);
  }

  return await db.transaction(async (tx) => {
    return await runner(tx);
  });
}

/**
 * Dual-entry internal transfer between two warehouse locations.
 * Atomically deducts (-qty) from source location and credits (+qty) to destination location.
 */
export async function recordStockTransfer(
  input: StockTransferInput,
  client?: DbOrTx
): Promise<{
  outflow: StockMovementResult;
  inflow: StockMovementResult;
}> {
  const {
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    transferId = null,
    notes = null,
    createdBy = null,
    allowNegativeStock = false,
  } = input;

  if (quantity <= 0) {
    throw new HTTPException(400, {
      message: "Transfer quantity must be greater than zero.",
    });
  }

  if (fromLocationId === toLocationId) {
    throw new HTTPException(400, {
      message: "Source and destination locations cannot be identical.",
    });
  }

  const executeTransfer = async (tx: DbOrTx) => {
    // 1. Outflow from source (-quantity)
    const outflow = await recordStockMovement(
      {
        productId,
        locationId: fromLocationId,
        deltaQty: -quantity,
        sourceType: "transfer",
        sourceId: transferId,
        notes: notes ? `Transfer Out: ${notes}` : "Transfer Out",
        createdBy,
        allowNegativeStock,
      },
      tx
    );

    // 2. Inflow to destination (+quantity)
    const inflow = await recordStockMovement(
      {
        productId,
        locationId: toLocationId,
        deltaQty: quantity,
        sourceType: "transfer",
        sourceId: transferId,
        notes: notes ? `Transfer In: ${notes}` : "Transfer In",
        createdBy,
        allowNegativeStock: true, // Inflow never causes negative balance
      },
      tx
    );

    return { outflow, inflow };
  };

  if (client) {
    return await executeTransfer(client);
  }

  return await db.transaction(async (tx) => {
    return await executeTransfer(tx);
  });
}

/**
 * Adjusts inventory to match a physical count.
 * Calculates delta = countedQuantity - currentBalance and appends ledger record.
 */
export async function recordStockAdjustment(
  input: StockAdjustmentInput,
  client?: DbOrTx
): Promise<StockMovementResult | null> {
  const { productId, locationId, countedQuantity, adjustmentId = null, notes = null, createdBy = null } = input;

  if (countedQuantity < 0) {
    throw new HTTPException(400, {
      message: "Counted quantity cannot be negative.",
    });
  }

  const executeAdjustment = async (tx: DbOrTx) => {
    const [existing] = await tx
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.productId, productId),
          eq(stockLevels.locationId, locationId)
        )
      )
      .limit(1);

    const currentQty = existing ? existing.quantity : 0;
    const delta = countedQuantity - currentQty;

    if (delta === 0) {
      // No change needed
      return null;
    }

    return await recordStockMovement(
      {
        productId,
        locationId,
        deltaQty: delta,
        sourceType: "adjustment",
        sourceId: adjustmentId,
        notes: notes || `Inventory count adjustment from ${currentQty} to ${countedQuantity}`,
        createdBy,
        allowNegativeStock: false,
      },
      tx
    );
  };

  if (client) {
    return await executeAdjustment(client);
  }

  return await db.transaction(async (tx) => {
    return await executeAdjustment(tx);
  });
}
