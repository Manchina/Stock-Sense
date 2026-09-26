import { describe, expect, it } from "vitest";
import app from "../../src/index";

describe("Authentication Integration Tests", () => {
  const timestamp = Date.now();
  const testUser = {
    name: "Auth Test Engineer",
    email: `engineer.${timestamp}@stocksense.test`,
    password: "StrongPassword123!",
    role: "inventory_manager" as const,
  };

  let accessToken: string;
  let refreshToken: string;
  let generatedOtp: string;
  let resetToken: string;

  it("POST /auth/signup - should register a new user successfully", async () => {
    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.role).toBe(testUser.role);
    expect(body.user.passwordHash).toBeUndefined(); // Ensure sensitive data is never exposed
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("POST /auth/signup - should reject duplicate email with 409 Conflict", async () => {
    const res = await app.request("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.message).toContain("already exists");
  });

  it("POST /auth/login - should authenticate user with correct credentials", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe(testUser.email);
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();

    accessToken = body.token;
    refreshToken = body.refreshToken;
  });

  it("POST /auth/login - should reject invalid credentials with 401 Unauthorized", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: "IncorrectPassword999!",
      }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.message).toContain("Invalid email or password");
  });

  it("GET /auth/me - should return authenticated user profile when Bearer token is provided", async () => {
    const res = await app.request("/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.user.email).toBe(testUser.email);
    expect(body.user.name).toBe(testUser.name);
  });

  it("GET /auth/me - should reject request with 401 when Bearer token is missing", async () => {
    const res = await app.request("/auth/me", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  it("POST /auth/refresh - should issue new access token using valid refresh token", async () => {
    const res = await app.request("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe(testUser.email);
  });

  it("POST /auth/otp/request - should generate OTP for password reset", async () => {
    const res = await app.request("/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUser.email }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.otp).toBeDefined();
    generatedOtp = body.otp;
  });

  it("POST /auth/otp/verify - should reject invalid OTP code with 400 Bad Request", async () => {
    const res = await app.request("/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        code: "000000",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("POST /auth/otp/verify - should validate correct OTP and issue reset token", async () => {
    const res = await app.request("/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        code: generatedOtp,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.resetToken).toBeDefined();
    resetToken = body.resetToken;
  });

  it("POST /auth/reset-password - should reset password using valid reset token", async () => {
    const newPassword = "NewSecretPassword2026!";
    const res = await app.request("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resetToken,
        newPassword,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);

    // Verify login with new password succeeds
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword,
      }),
    });
    expect(loginRes.status).toBe(200);

    // Verify login with old password fails
    const oldLoginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    expect(oldLoginRes.status).toBe(401);
  });
});
