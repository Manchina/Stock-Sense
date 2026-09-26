import { describe, expect, it } from "vitest";
import {
  signAccessToken,
  signRefreshToken,
  signResetToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyResetToken,
} from "../../src/lib/jwt";

describe("JWT Utility", () => {
  const mockUser = {
    sub: "usr-uuid-12345",
    email: "test.dev@stocksense.io",
    role: "inventory_manager",
    name: "Test Developer",
  };

  it("should sign and verify an access token with proper claims", async () => {
    const token = await signAccessToken(mockUser);
    expect(token).toBeTypeOf("string");

    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe(mockUser.sub);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.role).toBe(mockUser.role);
    expect(payload.name).toBe(mockUser.name);
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("should sign and verify a refresh token with tokenType=refresh", async () => {
    const refreshToken = await signRefreshToken({
      sub: mockUser.sub,
      email: mockUser.email,
    });
    expect(refreshToken).toBeTypeOf("string");

    const payload = await verifyRefreshToken(refreshToken);
    expect(payload.sub).toBe(mockUser.sub);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.tokenType).toBe("refresh");
  });

  it("should sign and verify a password reset token with purpose=password_reset", async () => {
    const resetToken = await signResetToken({
      sub: mockUser.sub,
      email: mockUser.email,
    });
    expect(resetToken).toBeTypeOf("string");

    const payload = await verifyResetToken(resetToken);
    expect(payload.sub).toBe(mockUser.sub);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.purpose).toBe("password_reset");
  });

  it("should reject invalid or tampered tokens", async () => {
    await expect(verifyAccessToken("invalid.token.structure")).rejects.toThrow();
  });
});
