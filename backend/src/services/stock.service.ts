import { and, eq } from "drizzle-orm";
import { stockLevels } from "../db/schema/stock-levels.schema";
import { stockLedger } from "../db/schema/ledger.schema";

export type LedgerSourceType =
  | "receipt"
  | "delivery"
  | "transfer"
  | "adjustment"
  | "initial_inventory";

export interface StockMovementInput {
  productId: string;
  locationId: string;
  deltaQty: number;
  sourceType: LedgerSourceType;
  sourceId?: string | null;
  notes?: string | null;
  userId?: string | null;
  allowNegative?: boolean;
}

export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly locationId: string,
    public readonly currentBalance: number,
    public readonly requestedDelta: number
  ) {
    super(
      `Insufficient stock for product ${productId} at location ${locationId}. Current balance: ${currentBalance}, delta: ${deltaQtyToStr(
        requestedDelta
      )}`
    );
    this.name = "InsufficientStockError";
  }
}

function deltaQtyToStr(delta: number): string {
  return delta >= 0 ? `+${delta}` : `${delta}`;
}

/**
 * Executes an atomic stock movement inside an existing database transaction.
 *
 * Enforces the core mathematical invariants of StockSense:
 * 1. Balance_after = Balance_before + Delta_qty
 * 2. Immutable Ledger Rule: Appends exactly one row to `stock_ledger` per movement
 * 3. Atomic Balance Invariant: Updates `stock_levels` and logs to `stock_ledger` atomically
 */
export async function executeStockMovement(
  tx: any,
  input: StockMovementInput
): Promise<{
  newBalance: number;
  previousBalance: number;
  ledgerId: string;
}> {
  const {
    productId,
    locationId,
    deltaQty,
    sourceType,
    sourceId = null,
    notes = null,
    userId = null,
    allowNegative = false,
  } = input;

  // 1. Fetch current stock balance for (productId, locationId)
  const existingLevel = await tx.query.stockLevels.findFirst({
    where: and(
      eq(stockLevels.productId, productId),
      eq(stockLevels.locationId, locationId)
    ),
  });

  const previousBalance = existingLevel?.quantity ?? 0;
  const newBalance = previousBalance + deltaQty;

  // 2. Invariant check: Prevent negative inventory unless explicitly permitted
  if (newBalance < 0 && !allowNegative) {
    throw new InsufficientStockError(
      productId,
      locationId,
      previousBalance,
      deltaQty
    );
  }

  // 3. Upsert stock_levels balance
  if (existingLevel) {
    await tx
      .update(stockLevels)
      .set({
        quantity: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(stockLevels.id, existingLevel.id));
  } else {
    await tx.insert(stockLevels).values({
      productId,
      locationId,
      quantity: newBalance,
      updatedAt: new Date(),
    });
  }

  // 4. Append immutable entry to stock_ledger
  const [ledgerRow] = await tx
    .insert(stockLedger)
    .values({
      productId,
      locationId,
      deltaQty,
      sourceType,
      sourceId: sourceId || null,
      balanceAfter: newBalance,
      notes: notes || null,
      createdBy: userId || null,
    })
    .returning();

  if (!ledgerRow) {
    throw new Error("Failed to insert stock ledger audit record");
  }

  return {
    newBalance,
    previousBalance,
    ledgerId: ledgerRow.id,
  };
}
