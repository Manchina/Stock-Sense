import { Context } from "hono";
import { eq, inArray, desc } from "drizzle-orm";
import { db } from "../../config/db";
import { products } from "../../db/schema/products.schema";
import { deliveryOrders } from "../../db/schema/deliveries.schema";
import { receipts } from "../../db/schema/receipts.schema";
import { transfers } from "../../db/schema/transfers.schema";

export interface DashboardNotificationItem {
  id: string;
  type: "error" | "warning" | "info" | "success";
  category: "low_stock" | "delivery" | "receipt" | "transfer" | "system";
  title: string;
  message: string;
  timestamp: string;
  link?: string;
  actionLabel?: string;
}

/**
 * GET /api/v1/dashboard/notifications
 * Generates dynamic, real-time inventory notifications from live database state.
 */
export async function getNotificationsHandler(c: Context) {
  try {
    const notifications: DashboardNotificationItem[] = [];

    // 1. Fetch active products with stock levels to detect low/out-of-stock items
    const [activeProducts, pendingDeliveries, pendingReceipts, pendingTransfers] =
      await Promise.all([
        db.query.products.findMany({
          where: eq(products.isActive, true),
          with: {
            stockLevels: true,
          },
        }),
        db.query.deliveryOrders.findMany({
          where: inArray(deliveryOrders.status, ["waiting", "ready"]),
          orderBy: [desc(deliveryOrders.createdAt)],
          limit: 10,
        }),
        db.query.receipts.findMany({
          where: inArray(receipts.status, ["waiting", "ready"]),
          orderBy: [desc(receipts.createdAt)],
          limit: 10,
        }),
        db.query.transfers.findMany({
          where: inArray(transfers.status, ["waiting", "ready"]),
          orderBy: [desc(transfers.createdAt)],
          limit: 10,
        }),
      ]);

    // Generate product alerts
    for (const prod of activeProducts) {
      const currentStock = (prod.stockLevels || []).reduce(
        (acc, sl) => acc + (Number(sl.quantity) || 0),
        0
      );
      const threshold = prod.reorderPoint ?? 0;

      if (currentStock === 0) {
        notifications.push({
          id: `notif-oos-${prod.id}`,
          type: "error",
          category: "low_stock",
          title: "Out of Stock Alert",
          message: `${prod.name} (${prod.sku}) has 0 units remaining in stock. Safety threshold is ${threshold} ${prod.uom}.`,
          timestamp: prod.updatedAt ? new Date(prod.updatedAt).toISOString() : new Date().toISOString(),
          link: `/products/${prod.id}`,
          actionLabel: "View Product",
        });
      } else if (currentStock <= threshold) {
        notifications.push({
          id: `notif-low-${prod.id}`,
          type: "warning",
          category: "low_stock",
          title: "Low Stock Warning",
          message: `${prod.name} (${prod.sku}) has ${currentStock} ${prod.uom} remaining, below safety threshold of ${threshold} ${prod.uom}.`,
          timestamp: prod.updatedAt ? new Date(prod.updatedAt).toISOString() : new Date().toISOString(),
          link: `/products/${prod.id}`,
          actionLabel: "Reorder Stock",
        });
      }
    }

    // Generate delivery order alerts
    for (const d of pendingDeliveries) {
      notifications.push({
        id: `notif-del-${d.id}`,
        type: "info",
        category: "delivery",
        title: d.status === "ready" ? "Delivery Ready for Dispatch" : "Delivery Awaiting Pick & Pack",
        message: `Order #${d.orderNumber} for ${d.customerName} is in ${d.status} status.`,
        timestamp: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString(),
        link: `/operations/deliveries/${d.id}`,
        actionLabel: "Review Order",
      });
    }

    // Generate incoming receipt alerts
    for (const r of pendingReceipts) {
      notifications.push({
        id: `notif-rec-${r.id}`,
        type: "info",
        category: "receipt",
        title: "Inbound Shipment Pending Intake",
        message: `Receipt #${r.receiptNumber} from ${r.supplierName} is ${r.status}.`,
        timestamp: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
        link: `/operations/receipts/${r.id}`,
        actionLabel: "Validate Goods",
      });
    }

    // Generate internal transfer alerts
    for (const t of pendingTransfers) {
      notifications.push({
        id: `notif-trf-${t.id}`,
        type: "info",
        category: "transfer",
        title: "Internal Transfer Scheduled",
        message: `Transfer #${t.transferNumber} is scheduled and awaiting execution.`,
        timestamp: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
        link: `/operations/transfers/${t.id}`,
        actionLabel: "Process Move",
      });
    }

    // Sort: errors first, then warnings, then info, then by date descending
    const severityRank: Record<string, number> = {
      error: 1,
      warning: 2,
      info: 3,
      success: 4,
    };

    notifications.sort((a, b) => {
      const rankDiff = (severityRank[a.type] || 5) - (severityRank[b.type] || 5);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return c.json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.length,
      data: notifications,
    });
  } catch (error: any) {
    console.error("Error generating notifications:", error);
    return c.json(
      {
        success: false,
        message: "Failed to generate inventory notifications",
        error: error.message || String(error),
      },
      500
    );
  }
}
