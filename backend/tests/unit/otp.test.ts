import { describe, expect, it } from "vitest";
import { generateOtp, getOtpExpiresAt, hashOtp } from "../../src/lib/otp-provider";

describe("OTP Provider Utility", () => {
  it("should generate a 6-digit numeric OTP", () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    }
  });

  it("should compute deterministic SHA-256 hash", () => {
    const code = "123456";
    const hash1 = hashOtp(code);
    const hash2 = hashOtp(code);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it("should compute expiration time 10 minutes ahead", () => {
    const now = Date.now();
    const expiresAt = getOtpExpiresAt(10);
    const diffMs = expiresAt.getTime() - now;

    // Should be approximately 10 minutes (600,000 ms) within a 5-second tolerance
    expect(diffMs).toBeGreaterThanOrEqual(595000);
    expect(diffMs).toBeLessThanOrEqual(605000);
  });
});
