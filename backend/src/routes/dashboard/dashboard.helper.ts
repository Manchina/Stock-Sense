/* eslint-disable @typescript-eslint/no-explicit-any */

export interface NormalizedOperation {
  id: string;
  documentNumber: string;
  type: "receipt" | "delivery" | "internal" | "adjustment";
  status: "draft" | "waiting" | "ready" | "done" | "canceled";
  partner?: string;
  sourceLocation?: string;
  destinationLocation?: string;
  items: Array<{
    productId?: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitOfMeasure: string;
  }>;
  notes?: string;
  createdAt: string;
  scheduledDate?: string;
  validatedAt?: string;
  validatedBy?: string;
  createdBy?: string;
  warehouseId?: string;
  categoryIds?: string[];
  categories?: string[];
}

export function formatReceiptOperation(r: any): NormalizedOperation {
  const destWh = r.destinationWarehouse;
  const destLoc = r.destinationLocation;
  const destLabel = destWh
    ? `${destWh.code || destWh.name} / ${destLoc?.name || "General"}`
    : destLoc?.name || "Receiving Bay";

  const lines = (r.lines || []).map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    quantity: Number(line.qtyReceived || line.qtyExpected || 0),
    unitOfMeasure: line.product?.uom || "units",
  }));

  const categoryIds = (r.lines || [])
    .map((l: any) => l.product?.categoryId)
    .filter(Boolean);
  const categories = (r.lines || [])
    .map((l: any) => l.product?.category?.name)
    .filter(Boolean);

  return {
    id: r.id,
    documentNumber: r.receiptNumber,
    type: "receipt",
    status: r.status,
    partner: r.supplierName || "Vendor",
    sourceLocation: `Vendor (${r.supplierName || "Supplier"})`,
    destinationLocation: destLabel,
    items: lines,
    notes: r.notes || "",
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    scheduledDate: r.expectedDate ? new Date(r.expectedDate).toISOString() : undefined,
    validatedAt: r.validatedAt ? new Date(r.validatedAt).toISOString() : undefined,
    validatedBy: r.validator?.name || undefined,
    createdBy: r.creator?.name || undefined,
    warehouseId: r.destinationWarehouseId,
    categoryIds,
    categories,
  };
}

export function formatDeliveryOperation(d: any): NormalizedOperation {
  const srcWh = d.sourceWarehouse;
  const srcLoc = d.sourceLocation;
  const srcLabel = srcWh
    ? `${srcWh.code || srcWh.name} / ${srcLoc?.name || "General"}`
    : srcLoc?.name || "Dispatch Bay";

  const lines = (d.lines || []).map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    quantity: Number(line.qtyDelivered || line.qtyOrdered || 0),
    unitOfMeasure: line.product?.uom || "units",
  }));

  const categoryIds = (d.lines || [])
    .map((l: any) => l.product?.categoryId)
    .filter(Boolean);
  const categories = (d.lines || [])
    .map((l: any) => l.product?.category?.name)
    .filter(Boolean);

  return {
    id: d.id,
    documentNumber: d.orderNumber,
    type: "delivery",
    status: d.status,
    partner: d.customerName || "Customer",
    sourceLocation: srcLabel,
    destinationLocation: `Customer (${d.customerName || "Customer"})`,
    items: lines,
    notes: d.notes || "",
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date(d.createdAt).toISOString(),
    validatedAt: d.validatedAt ? new Date(d.validatedAt).toISOString() : undefined,
    validatedBy: d.validator?.name || undefined,
    createdBy: d.creator?.name || undefined,
    warehouseId: d.sourceWarehouseId,
    categoryIds,
    categories,
  };
}

export function formatTransferOperation(t: any): NormalizedOperation {
  const srcWh = t.sourceLocation?.warehouse;
  const srcLoc = t.sourceLocation;
  const srcLabel = srcWh
    ? `${srcWh.code || srcWh.name} / ${srcLoc?.name || "General"}`
    : srcLoc?.name || "Unknown Source";

  const dstWh = t.destLocation?.warehouse;
  const dstLoc = t.destLocation;
  const destLabel = dstWh
    ? `${dstWh.code || dstWh.name} / ${dstLoc?.name || "General"}`
    : dstLoc?.name || "Unknown Destination";

  const lines = (t.lines || []).map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    quantity: Number(line.quantity || 0),
    unitOfMeasure: line.product?.uom || "units",
  }));

  const categoryIds = (t.lines || [])
    .map((l: any) => l.product?.categoryId)
    .filter(Boolean);
  const categories = (t.lines || [])
    .map((l: any) => l.product?.category?.name)
    .filter(Boolean);

  return {
    id: t.id,
    documentNumber: t.transferNumber,
    type: "internal",
    status: t.status,
    sourceLocation: srcLabel,
    destinationLocation: destLabel,
    items: lines,
    notes: t.notes || "",
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
    validatedAt: t.validatedAt ? new Date(t.validatedAt).toISOString() : undefined,
    validatedBy: t.validator?.name || undefined,
    createdBy: t.creator?.name || undefined,
    warehouseId: srcWh?.id || dstWh?.id,
    categoryIds,
    categories,
  };
}

export function formatAdjustmentOperation(a: any): NormalizedOperation {
  const wh = a.location?.warehouse;
  const loc = a.location;
  const locationLabel = wh
    ? `${wh.code || wh.name} / ${loc?.name || "General"}`
    : loc?.name || "Adjustment Location";

  const lines = (a.lines || []).map((line: any) => ({
    productId: line.productId,
    productName: line.product?.name || "Unknown Product",
    sku: line.product?.sku || "N/A",
    quantity: Number(line.deltaQty || 0),
    unitOfMeasure: line.product?.uom || "units",
  }));

  const categoryIds = (a.lines || [])
    .map((l: any) => l.product?.categoryId)
    .filter(Boolean);
  const categories = (a.lines || [])
    .map((l: any) => l.product?.category?.name)
    .filter(Boolean);

  return {
    id: a.id,
    documentNumber: a.adjustmentNumber,
    type: "adjustment",
    status: a.status,
    sourceLocation: locationLabel,
    items: lines,
    notes: a.notes || a.reason || "",
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : new Date(a.createdAt).toISOString(),
    validatedAt: a.appliedAt ? new Date(a.appliedAt).toISOString() : undefined,
    validatedBy: a.applier?.name || undefined,
    createdBy: a.creator?.name || undefined,
    warehouseId: wh?.id,
    categoryIds,
    categories,
  };
}
