import { OperationDocument, OperationItem } from "../../types/common";
import { INITIAL_OPERATIONS } from "../../lib/constants";
import { api } from "../../lib/api";

let fallbackTransfers: OperationDocument[] = INITIAL_OPERATIONS.filter(
  (o) => o.type === "internal"
);

export interface TransferFormData {
  sourceLocation: string;
  sourceLocationId?: string;
  destinationLocation: string;
  destinationLocationId?: string;
  status: "draft" | "waiting" | "ready" | "done" | "canceled";
  notes?: string;
  scheduledDate?: string;
  items: OperationItem[];
}

export const transfersApi = {
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
      const endpoint = qs ? `/transfers?${qs}` : "/transfers";
      const res = await api.get<{
        success: boolean;
        data: OperationDocument[];
      }>(endpoint);

      if (res && res.data && Array.isArray(res.data)) {
        fallbackTransfers = res.data;
        return res.data;
      }
      return fallbackTransfers;
    } catch (err) {
      console.warn(
        "Could not load transfers from API, using fallback cache:",
        err
      );
      return [...fallbackTransfers];
    }
  },

  getById: async (id: string): Promise<OperationDocument | undefined> => {
    try {
      const res = await api.get<{
        success: boolean;
        data: OperationDocument;
      }>(`/transfers/${id}`);

      if (res && res.data) {
        return res.data;
      }
      return fallbackTransfers.find((t) => t.id === id || t.documentNumber === id);
    } catch (err) {
      console.warn(
        `Could not load transfer ${id} from API, checking fallback:`,
        err
      );
      return fallbackTransfers.find((t) => t.id === id || t.documentNumber === id);
    }
  },

  create: async (data: TransferFormData): Promise<OperationDocument> => {
    const payload = {
      sourceLocation: data.sourceLocation,
      sourceLocationId: data.sourceLocationId,
      destinationLocation: data.destinationLocation,
      destinationLocationId: data.destinationLocationId,
      status: data.status,
      notes: data.notes?.trim() || undefined,
      scheduledDate: data.scheduledDate || undefined,
      items: data.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        quantity: Number(i.quantity) || 1,
        unitOfMeasure: i.unitOfMeasure,
      })),
    };

    try {
      const res = await api.post<{
        success: boolean;
        data: OperationDocument;
      }>("/transfers", payload);

      if (res && res.data) {
        fallbackTransfers.unshift(res.data);
        return res.data;
      }
      throw new Error("Invalid response received from transfers API");
    } catch (err: any) {
      console.warn("API transfer creation failed, falling back locally:", err);
      if (err?.message && (err.message.includes("Insufficient") || err.message.includes("identical") || err.message.includes("Validation failed"))) {
        throw err;
      }

      // Local fallback
      const docNum = `INT-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;
      const fallbackItem: OperationDocument = {
        id: `op-int-${Date.now()}`,
        documentNumber: docNum,
        type: "internal",
        status: data.status,
        sourceLocation: data.sourceLocation,
        destinationLocation: data.destinationLocation,
        items: data.items,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        scheduledDate: data.scheduledDate,
        validatedAt: data.status === "done" ? new Date().toISOString() : undefined,
        validatedBy: data.status === "done" ? "System Operator" : undefined,
      };
      fallbackTransfers.unshift(fallbackItem);
      return fallbackItem;
    }
  },

  update: async (
    id: string,
    data: Partial<TransferFormData>
  ): Promise<OperationDocument> => {
    try {
      const res = await api.put<{
        success: boolean;
        data: OperationDocument;
      }>(`/transfers/${id}`, data);

      if (res && res.data) {
        const idx = fallbackTransfers.findIndex((t) => t.id === id);
        if (idx !== -1) fallbackTransfers[idx] = res.data;
        return res.data;
      }
      throw new Error("Invalid response received from transfers API");
    } catch (err: any) {
      console.warn(`API transfer update failed for ${id}:`, err);
      if (err?.message && (err.message.includes("Insufficient") || err.message.includes("identical"))) {
        throw err;
      }

      const idx = fallbackTransfers.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Transfer not found in local cache");

      const updated: OperationDocument = {
        ...fallbackTransfers[idx],
        ...data,
        validatedAt: data.status === "done" ? new Date().toISOString() : fallbackTransfers[idx].validatedAt,
        validatedBy: data.status === "done" ? "System Operator" : fallbackTransfers[idx].validatedBy,
      };
      fallbackTransfers[idx] = updated;
      return updated;
    }
  },
};
