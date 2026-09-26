/* eslint-disable @typescript-eslint/no-explicit-any */
import { Context } from "hono";
import { desc } from "drizzle-orm";
import { db } from "../../config/db";
import { receipts } from "../../db/schema/receipts.schema";
import { deliveryOrders } from "../../db/schema/deliveries.schema";
import { transfers } from "../../db/schema/transfers.schema";
import { adjustments } from "../../db/schema/adjustments.schema";
import { dashboardOperationsQuerySchema } from "./dashboard.schema";
import {
  formatReceiptOperation,
  formatDeliveryOperation,
  formatTransferOperation,
  formatAdjustmentOperation,
  NormalizedOperation,
} from "./dashboard.helper";

/**
 * GET /api/v1/dashboard/operations
 * Unified multi-dimensional operations query endpoint.
 */
export async function getOperationsHandler(c: Context) {
  try {
    const rawQuery = c.req.query();
    const query = dashboardOperationsQuerySchema.parse(rawQuery);

    const docType = query.documentType || query.docType || "all";
    const status = query.status || "all";
    const warehouseFilter = query.warehouseId?.trim();
    const categoryFilter = query.category?.trim();
    const search = query.search?.trim().toLowerCase();

    const fetchReceipts = docType === "all" || docType === "receipt";
    const fetchDeliveries = docType === "all" || docType === "delivery";
    const fetchTransfers = docType === "all" || docType === "internal";
    const fetchAdjustments = docType === "all" || docType === "adjustment";

    const [rawReceipts, rawDeliveries, rawTransfers, rawAdjustments] = await Promise.all([
      fetchReceipts
        ? db.query.receipts.findMany({
            with: {
              destinationWarehouse: true,
              destinationLocation: true,
              validator: true,
              creator: true,
              lines: {
                with: {
                  product: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(receipts.createdAt)],
            limit: 100,
          })
        : Promise.resolve([]),

      fetchDeliveries
        ? db.query.deliveryOrders.findMany({
            with: {
              sourceWarehouse: true,
              sourceLocation: true,
              validator: true,
              creator: true,
              lines: {
                with: {
                  product: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(deliveryOrders.createdAt)],
            limit: 100,
          })
        : Promise.resolve([]),

      fetchTransfers
        ? db.query.transfers.findMany({
            with: {
              sourceLocation: {
                with: {
                  warehouse: true,
                },
              },
              destLocation: {
                with: {
                  warehouse: true,
                },
              },
              validator: true,
              creator: true,
              lines: {
                with: {
                  product: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(transfers.createdAt)],
            limit: 100,
          })
        : Promise.resolve([]),

      fetchAdjustments
        ? db.query.adjustments.findMany({
            with: {
              location: {
                with: {
                  warehouse: true,
                },
              },
              applier: true,
              creator: true,
              lines: {
                with: {
                  product: {
                    with: {
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: [desc(adjustments.createdAt)],
            limit: 100,
          })
        : Promise.resolve([]),
    ]);

    const allNormalized: NormalizedOperation[] = [
      ...rawReceipts.map(formatReceiptOperation),
      ...rawDeliveries.map(formatDeliveryOperation),
      ...rawTransfers.map(formatTransferOperation),
      ...rawAdjustments.map(formatAdjustmentOperation),
    ];

    // Apply filters
    const filtered = allNormalized.filter((op) => {
      // 1. Status Filter
      if (status !== "all" && op.status !== status) {
        return false;
      }

      // 2. Warehouse Filter
      if (warehouseFilter && warehouseFilter !== "all") {
        const wf = warehouseFilter.toLowerCase();
        const srcMatches = op.sourceLocation?.toLowerCase().includes(wf);
        const dstMatches = op.destinationLocation?.toLowerCase().includes(wf);
        const whIdMatches = op.warehouseId?.toLowerCase() === wf;
        if (!srcMatches && !dstMatches && !whIdMatches) {
          return false;
        }
      }

      // 3. Category Filter
      if (categoryFilter && categoryFilter !== "all") {
        const cf = categoryFilter.toLowerCase();
        const hasMatchingCat =
          (op.categories || []).some((c) => c.toLowerCase() === cf || c.toLowerCase().includes(cf)) ||
          (op.categoryIds || []).some((cid) => cid.toLowerCase() === cf);
        if (!hasMatchingCat) {
          return false;
        }
      }

      // 4. Search Filter
      if (search) {
        const docMatches = op.documentNumber.toLowerCase().includes(search);
        const partnerMatches = op.partner?.toLowerCase().includes(search);
        const notesMatches = op.notes?.toLowerCase().includes(search);
        const itemMatches = op.items.some(
          (item) =>
            item.productName.toLowerCase().includes(search) ||
            item.sku?.toLowerCase().includes(search)
        );
        if (!docMatches && !partnerMatches && !notesMatches && !itemMatches) {
          return false;
        }
      }

      return true;
    });

    // Sort chronologically descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Paginate
    const paginated = filtered.slice(query.offset, query.offset + query.limit);

    return c.json({
      success: true,
      count: paginated.length,
      total: filtered.length,
      data: paginated,
    });
  } catch (error: any) {
    console.error("Error fetching dashboard operations:", error);
    return c.json(
      {
        success: false,
        message: "Failed to retrieve dashboard operations",
        error: error.message || String(error),
      },
      500
    );
  }
}
