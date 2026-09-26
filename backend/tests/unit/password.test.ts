import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "../../src/lib/password";

describe("Password Utility", () => {
  it("should securely hash a password and verify correctly", async () => {
    const raw = "SuperSecretP@ssw0rd!";
    const hash = await hashPassword(raw);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2")).toBe(true);

    const isMatch = await comparePassword(raw, hash);
    expect(isMatch).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const raw = "CorrectPassword123";
    const wrong = "WrongPassword456";
    const hash = await hashPassword(raw);

    const isMatch = await comparePassword(wrong, hash);
    expect(isMatch).toBe(false);
  });
});
