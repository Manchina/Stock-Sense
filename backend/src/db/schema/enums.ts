import { pgEnum } from "drizzle-orm/pg-core";

// User roles for Role-Based Access Control (RBAC)
export const userRoleEnum = pgEnum("user_role", [
  "inventory_manager",
  "warehouse_staff",
]);

// Purpose of one-time password (OTP)
export const otpPurposeEnum = pgEnum("otp_purpose", [
  "password_reset",
]);

// Shared status across core operations (Receipts, Deliveries, Transfers, Adjustments)
export const operationStatusEnum = pgEnum("operation_status", [
  "draft",
  "waiting",
  "ready",
  "done",
  "canceled",
]);

// Source operation types generating immutable stock ledger movements
export const ledgerSourceTypeEnum = pgEnum("ledger_source_type", [
  "receipt",
  "delivery",
  "transfer",
  "adjustment",
  "initial_inventory",
]);
