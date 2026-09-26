import type { Context, MiddlewareHandler } from "hono";
import { verifyAccessToken } from "../lib/jwt";
import { authService, type SafeUser } from "../modules/auth/auth.service";

declare module "hono" {
  interface ContextVariableMap {
    user: SafeUser;
    userId: string;
  }
}

/**
 * Middleware that authenticates incoming requests using Bearer JWT tokens.
 * Attaches the authenticated user model to Hono context `c.get('user')`.
 */
export const authMiddleware: MiddlewareHandler = async (c: Context, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Missing or invalid Authorization header. Provide a valid Bearer token.",
      },
      401
    );
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = await verifyAccessToken(token);
    const user = await authService.getCurrentUser(payload.sub);

    if (!user || !user.isActive) {
      return c.json(
        {
          error: "Unauthorized",
          message: "User account is inactive or not found.",
        },
        401
      );
    }

    c.set("user", user);
    c.set("userId", user.id);

    return await next();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid or expired token";
    return c.json(
      {
        error: "Unauthorized",
        message: errorMessage,
      },
      401
    );
  }
};
