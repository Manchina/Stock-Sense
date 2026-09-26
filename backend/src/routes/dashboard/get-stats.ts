import { Context } from "hono";
import { sql } from "drizzle-orm";
import { db } from "../../config/db";

/**
 * GET /api/v1/dashboard/stats
 * Real-time aggregation of inventory KPIs and activity distribution
 * executed in a single atomic SQL roundtrip.
 */
export async function getStatsHandler(c: Context) {
  try {
    const res = await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM products WHERE is_active = true) AS total_products,
        (SELECT count(*)::int FROM products WHERE is_active = true AND (
          SELECT COALESCE(SUM(quantity), 0) FROM stock_levels WHERE stock_levels.product_id = products.id
        ) <= products.reorder_point) AS low_stock_count,
        (SELECT count(*)::int FROM receipts WHERE status NOT IN ('done', 'canceled')) AS pending_receipts,
        (SELECT count(*)::int FROM delivery_orders WHERE status NOT IN ('done', 'canceled')) AS pending_deliveries,
        (SELECT count(*)::int FROM transfers WHERE status NOT IN ('done', 'canceled')) AS scheduled_transfers,
        (SELECT count(*)::int FROM receipts) AS total_receipts,
        (SELECT count(*)::int FROM delivery_orders) AS total_deliveries,
        (SELECT count(*)::int FROM transfers) AS total_transfers,
        (SELECT count(*)::int FROM adjustments) AS total_adjustments;
    `);

    const row: any = res.rows[0] || {};

    const totalProducts = Number(row.total_products) || 0;
    const lowStockCount = Number(row.low_stock_count) || 0;
    const pendingReceipts = Number(row.pending_receipts) || 0;
    const pendingDeliveries = Number(row.pending_deliveries) || 0;
    const scheduledTransfers = Number(row.scheduled_transfers) || 0;

    const receiptCount = Number(row.total_receipts) || 0;
    const deliveryCount = Number(row.total_deliveries) || 0;
    const transferCount = Number(row.total_transfers) || 0;
    const adjustmentCount = Number(row.total_adjustments) || 0;

    const totalOps = receiptCount + deliveryCount + transferCount + adjustmentCount;

    let receiptPct = 0;
    let deliveryPct = 0;
    let transferPct = 0;
    let adjustmentPct = 0;

    if (totalOps > 0) {
      receiptPct = Math.round((receiptCount / totalOps) * 100);
      deliveryPct = Math.round((deliveryCount / totalOps) * 100);
      transferPct = Math.round((transferCount / totalOps) * 100);
      adjustmentPct = Math.max(0, 100 - (receiptPct + deliveryPct + transferPct));
    }

    const currentDate = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const activityBreakdown = [
      {
        label: "Receipts (In)",
        type: "receipt" as const,
        count: receiptCount,
        percentage: receiptPct,
        color: "bg-emerald-600",
      },
      {
        label: "Deliveries (Out)",
        type: "delivery" as const,
        count: deliveryCount,
        percentage: deliveryPct,
        color: "bg-blue-600",
      },
      {
        label: "Transfers",
        type: "internal" as const,
        count: transferCount,
        percentage: transferPct,
        color: "bg-teal-600",
      },
      {
        label: "Adjustments",
        type: "adjustment" as const,
        count: adjustmentCount,
        percentage: adjustmentPct,
        color: "bg-amber-600",
      },
    ];

    return c.json({
      success: true,
      data: {
        totalProducts,
        lowStockCount,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
        totalOperations: totalOps,
        monthLabel,
        activityBreakdown,
      },
    });
  } catch (error: any) {
    console.error("Error aggregating dashboard stats:", error);
    return c.json(
      {
        success: false,
        message: "Failed to aggregate dashboard metrics",
        error: error.message || String(error),
      },
      500
    );
  }
}
