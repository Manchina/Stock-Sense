import crypto from "node:crypto";

/**
 * Generates a cryptographically secure 6-digit numerical OTP.
 */
export function generateOtp(): string {
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Computes a deterministic SHA-256 hash of the OTP for secure DB storage.
 */
export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Returns an expiration Date 10 minutes in the future.
 */
export function getOtpExpiresAt(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
