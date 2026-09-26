import { OperationDocument, OperationItem } from "../../types/common";
import { INITIAL_OPERATIONS } from "../../lib/constants";
import { api } from "../../lib/api";

let fallbackAdjustments: OperationDocument[] = INITIAL_OPERATIONS.filter(
  (o) => o.type === "adjustment"
);

export interface AdjustmentFormData {
  location: string;
  locationId?: string;
  reason: string;
  status: "draft" | "waiting" | "ready" | "done" | "canceled";
  notes?: string;
  items: OperationItem[];
}

export const adjustmentsApi = {
  getAll: async (params?: {
    status?: string;
    search?: string;
  }): Promise<OperationDocument[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.status && params.status !== "all") {
        searchParams.set("status", params.status);
      }
      if (params?.search) {
        searchParams.set("search", params.search);
      }

      const qs = searchParams.toString();
      const endpoint = qs ? `/adjustments?${qs}` : "/adjustments";
      const res = await api.get<{
        success: boolean;
        data: OperationDocument[];
      }>(endpoint);

      if (res && res.data && Array.isArray(res.data)) {
        fallbackAdjustments = res.data;
        return res.data;
      }
      return fallbackAdjustments;
    } catch (err) {
      console.warn(
        "Could not load adjustments from API, using fallback cache:",
        err
      );
      return [...fallbackAdjustments];
    }
  },

  getById: async (id: string): Promise<OperationDocument | undefined> => {
    try {
      const res = await api.get<{
        success: boolean;
        data: OperationDocument;
      }>(`/adjustments/${id}`);

      if (res && res.data) {
        return res.data;
      }
      return fallbackAdjustments.find(
        (a) => a.id === id || a.documentNumber === id
      );
    } catch (err) {
      console.warn(
        `Could not load adjustment ${id} from API, checking fallback:`,
        err
      );
      return fallbackAdjustments.find(
        (a) => a.id === id || a.documentNumber === id
      );
    }
  },

  create: async (data: AdjustmentFormData): Promise<OperationDocument> => {
    const payload = {
      location: data.location,
      locationId: data.locationId,
      reason: data.reason.trim(),
      status: data.status,
      notes: data.notes?.trim() || data.reason.trim(),
      items: data.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: Number(i.quantity) || 0,
        deltaQty: Number(i.quantity) || 0,
        unitOfMeasure: i.unitOfMeasure,
      })),
    };

    try {
      const res = await api.post<{
        success: boolean;
        data: OperationDocument;
      }>("/adjustments", payload);

      if (res && res.data) {
        fallbackAdjustments.unshift(res.data);
        return res.data;
      }
      throw new Error("Invalid response received from adjustments API");
    } catch (err: any) {
      console.warn("API adjustment creation failed, falling back locally:", err);
      if (err?.message && (err.message.includes("negative") || err.message.includes("Validation failed"))) {
        throw err;
      }

      const docNum = `ADJ-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;
      const fallbackItem: OperationDocument = {
        id: `op-adj-${Date.now()}`,
        documentNumber: docNum,
        type: "adjustment",
        status: data.status,
        sourceLocation: data.location,
        items: data.items,
        notes: data.notes || data.reason,
        createdAt: new Date().toISOString(),
        validatedAt: data.status === "done" ? new Date().toISOString() : undefined,
        validatedBy: data.status === "done" ? "Inventory Manager" : undefined,
      };
      fallbackAdjustments.unshift(fallbackItem);
      return fallbackItem;
    }
  },

  update: async (
    id: string,
    data: Partial<AdjustmentFormData>
  ): Promise<OperationDocument> => {
    try {
      const res = await api.put<{
        success: boolean;
        data: OperationDocument;
      }>(`/adjustments/${id}`, data);

      if (res && res.data) {
        const idx = fallbackAdjustments.findIndex((a) => a.id === id);
        if (idx !== -1) fallbackAdjustments[idx] = res.data;
        return res.data;
      }
      throw new Error("Invalid response received from adjustments API");
    } catch (err: any) {
      console.warn(`API adjustment update failed for ${id}:`, err);
      const idx = fallbackAdjustments.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error("Adjustment not found in local cache");

      const updated: OperationDocument = {
        ...fallbackAdjustments[idx],
        ...data,
        validatedAt: data.status === "done" ? new Date().toISOString() : fallbackAdjustments[idx].validatedAt,
        validatedBy: data.status === "done" ? "Inventory Manager" : fallbackAdjustments[idx].validatedBy,
      };
      fallbackAdjustments[idx] = updated;
      return updated;
    }
  },
};
