import { sign, verify } from "hono/jwt";
import { env } from "../config/env";

export interface AccessTokenInput {
  sub: string;
  email: string;
  role: string;
  name: string;
}

export interface RefreshTokenInput {
  sub: string;
  email: string;
}

export interface ResetTokenInput {
  sub: string;
  email: string;
}

export interface AccessTokenPayload extends AccessTokenInput {
  exp: number;
  iat: number;
}

export interface RefreshTokenPayload extends RefreshTokenInput {
  tokenType: "refresh";
  exp: number;
  iat: number;
}

export interface ResetTokenPayload extends ResetTokenInput {
  purpose: "password_reset";
  exp: number;
  iat: number;
}

const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RESET_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Signs an access token with a 15-minute expiration time.
 */
export async function signAccessToken(payload: AccessTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
  };
  return sign(fullPayload as unknown as Record<string, unknown>, env.JWT_SECRET, "HS256");
}

/**
 * Signs a refresh token with a 7-day expiration time.
 */
export async function signRefreshToken(payload: RefreshTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: RefreshTokenPayload = {
    ...payload,
    tokenType: "refresh",
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
  };
  return sign(fullPayload as unknown as Record<string, unknown>, env.JWT_REFRESH_SECRET, "HS256");
}

/**
 * Signs a single-use password reset token with a 15-minute expiration time.
 */
export async function signResetToken(payload: ResetTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ResetTokenPayload = {
    ...payload,
    purpose: "password_reset",
    iat: now,
    exp: now + RESET_TOKEN_EXPIRY_SECONDS,
  };
  return sign(fullPayload as unknown as Record<string, unknown>, env.JWT_SECRET, "HS256");
}

/**
 * Verifies an access token using JWT_SECRET.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, "HS256");
  return payload as unknown as AccessTokenPayload;
}

/**
 * Verifies a refresh token using JWT_REFRESH_SECRET.
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = await verify(token, env.JWT_REFRESH_SECRET, "HS256");
  return payload as unknown as RefreshTokenPayload;
}

/**
 * Verifies a password reset token using JWT_SECRET.
 */
export async function verifyResetToken(token: string): Promise<ResetTokenPayload> {
  const payload = await verify(token, env.JWT_SECRET, "HS256");
  const parsed = payload as unknown as ResetTokenPayload;
  if (parsed.purpose !== "password_reset") {
    throw new Error("Invalid token purpose for password reset");
  }
  return parsed;
}
