import { and, desc, eq, gt, gte, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../../config/db";
import { env } from "../../config/env";
import { otpCodes, users, type User } from "../../db/schema";
import { signAccessToken, signRefreshToken, signResetToken, verifyRefreshToken, verifyResetToken } from "../../lib/jwt";
import { generateOtp, getOtpExpiresAt, hashOtp } from "../../lib/otp-provider";
import { comparePassword, hashPassword } from "../../lib/password";
import type { LoginInput, SignupInput, UpdateProfileInput } from "../../shared/validators/auth.validator";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "inventory_manager" | "warehouse_staff";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function sanitizeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  /**
   * Register a new user and generate authentication tokens.
   */
  async signup(input: SignupInput): Promise<{ user: SafeUser; token: string; refreshToken: string }> {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (existing) {
      throw new HTTPException(409, { message: "A user with this email address already exists" });
    }

    const passwordHash = await hashPassword(input.password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role ?? "warehouse_staff",
        isActive: true,
      })
      .returning();

    if (!newUser) {
      throw new HTTPException(500, { message: "Failed to create user account" });
    }

    const token = await signAccessToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    const refreshToken = await signRefreshToken({
      sub: newUser.id,
      email: newUser.email,
    });

    return {
      user: sanitizeUser(newUser),
      token,
      refreshToken,
    };
  }

  /**
   * Authenticate user with email and password.
   */
  async login(input: LoginInput): Promise<{ user: SafeUser; token: string; refreshToken: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user || !user.isActive) {
      throw new HTTPException(401, { message: "Invalid email or password" });
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new HTTPException(401, { message: "Invalid email or password" });
    }

    const token = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
    });

    return {
      user: sanitizeUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * Refresh expired access token using valid refresh token.
   */
  async refresh(refreshToken: string): Promise<{ user: SafeUser; token: string; refreshToken: string }> {
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired refresh token" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user || !user.isActive) {
      throw new HTTPException(401, { message: "User account not found or deactivated" });
    }

    const newAccessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const newRefreshToken = await signRefreshToken({
      sub: user.id,
      email: user.email,
    });

    return {
      user: sanitizeUser(user),
      token: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Generate and store 6-digit OTP for password reset with rate limiting.
   */
  async requestOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Don't leak whether the email is registered to attackers, but still proceed safely
    if (!user) {
      return {
        success: true,
        message: "If that email is registered, a 6-digit verification code has been generated.",
      };
    }

    // Rate-limiting: max 3 requests per 15 minutes per user
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentOtps = await db
      .select()
      .from(otpCodes)
      .where(and(eq(otpCodes.userId, user.id), gte(otpCodes.createdAt, fifteenMinutesAgo)));

    if (recentOtps.length >= 3) {
      throw new HTTPException(429, {
        message: "Too many OTP requests. Please wait 15 minutes before requesting a new code.",
      });
    }

    const rawOtp = generateOtp();
    const codeHash = hashOtp(rawOtp);
    const expiresAt = getOtpExpiresAt(10); // 10 minutes

    await db.insert(otpCodes).values({
      userId: user.id,
      codeHash,
      purpose: "password_reset",
      expiresAt,
    });

    console.log(`\n🔑 [OTP Provider] Reset code for ${user.email}: ${rawOtp} (expires in 10 mins)\n`);

    return {
      success: true,
      message: "A 6-digit verification code has been generated and sent.",
      otp: env.NODE_ENV !== "production" ? rawOtp : undefined,
    };
  }

  /**
   * Validate 6-digit OTP and issue a signed reset token.
   */
  async verifyOtp(email: string, code: string): Promise<{ success: boolean; resetToken: string }> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      throw new HTTPException(400, { message: "Invalid or expired OTP code" });
    }

    const codeHash = hashOtp(code);
    const now = new Date();

    const [validOtp] = await db
      .select()
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, user.id),
          eq(otpCodes.codeHash, codeHash),
          isNull(otpCodes.usedAt),
          gt(otpCodes.expiresAt, now)
        )
      )
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);

    if (!validOtp) {
      throw new HTTPException(400, { message: "Invalid or expired OTP code" });
    }

    // Mark code as used to prevent replay attacks
    await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, validOtp.id));

    // Sign 15-minute reset token
    const resetToken = await signResetToken({
      sub: user.id,
      email: user.email,
    });

    return {
      success: true,
      resetToken,
    };
  }

  /**
   * Reset user password using verified reset token.
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    let payload;
    try {
      payload = await verifyResetToken(resetToken);
    } catch {
      throw new HTTPException(400, { message: "Invalid or expired reset token" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user || !user.isActive) {
      throw new HTTPException(404, { message: "User account not found or inactive" });
    }

    const passwordHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Invalidate any other open OTPs for this user
    await db
      .update(otpCodes)
      .set({ usedAt: new Date() })
      .where(and(eq(otpCodes.userId, user.id), isNull(otpCodes.usedAt)));

    return {
      success: true,
      message: "Password has been successfully reset. You may now log in.",
    };
  }

  /**
   * Retrieve currently authenticated user by ID.
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new HTTPException(404, { message: "User account not found" });
    }

    return sanitizeUser(user);
  }

  /**
   * Update authenticated user profile details.
   * Only Super Admins are authorized to change or assign roles.
   */
  async updateProfile(userId: string, input: UpdateProfileInput, currentUser?: SafeUser): Promise<SafeUser> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.isActive) {
      throw new HTTPException(404, { message: "User account not found" });
    }

    if (input.email && input.email !== user.email) {
      const existing = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existing && existing.id !== userId) {
        throw new HTTPException(409, { message: "A user with this email address already exists" });
      }
    }

    // Role modification permission check: Only Super Admin can change user roles
    if (input.role !== undefined && input.role !== user.role) {
      if (currentUser?.role !== "super_admin") {
        throw new HTTPException(403, {
          message: "Permission denied: Only Super Admins can modify assigned roles.",
        });
      }
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.role !== undefined && currentUser?.role === "super_admin") {
      updateData.role = input.role;
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new HTTPException(500, { message: "Failed to update user profile" });
    }

    return sanitizeUser(updated);
  }
}

export const authService = new AuthService();

