import type { Context } from "hono";
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshTokenSchema,
  resetPasswordSchema,
  signupSchema,
} from "../../shared/validators/auth.validator";
import { authService } from "./auth.service";

export class AuthController {
  /**
   * POST /auth/signup
   */
  async signup(c: Context) {
    const body = await c.req.json();
    const validated = signupSchema.parse(body);
    const result = await authService.signup(validated);
    return c.json(result, 201);
  }

  /**
   * POST /auth/login
   */
  async login(c: Context) {
    const body = await c.req.json();
    const validated = loginSchema.parse(body);
    const result = await authService.login(validated);
    return c.json(result, 200);
  }

  /**
   * POST /auth/refresh
   */
  async refresh(c: Context) {
    const body = await c.req.json();
    const validated = refreshTokenSchema.parse(body);
    const result = await authService.refresh(validated.refreshToken);
    return c.json(result, 200);
  }

  /**
   * POST /auth/otp/request
   */
  async requestOtp(c: Context) {
    const body = await c.req.json();
    const validated = otpRequestSchema.parse(body);
    const result = await authService.requestOtp(validated.email);
    return c.json(result, 200);
  }

  /**
   * POST /auth/otp/verify
   */
  async verifyOtp(c: Context) {
    const body = await c.req.json();
    const validated = otpVerifySchema.parse(body);
    const result = await authService.verifyOtp(validated.email, validated.code);
    return c.json(result, 200);
  }

  /**
   * POST /auth/reset-password
   */
  async resetPassword(c: Context) {
    const body = await c.req.json();
    const validated = resetPasswordSchema.parse(body);
    const result = await authService.resetPassword(validated.resetToken, validated.newPassword);
    return c.json(result, 200);
  }

  /**
   * GET /auth/me (Protected)
   */
  async getMe(c: Context) {
    const user = c.get("user");
    return c.json({ user }, 200);
  }
}

export const authController = new AuthController();
