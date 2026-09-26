import type { MiddlewareHandler } from "hono";

export type AllowedRole = "inventory_manager" | "warehouse_staff";

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses one of the allowed roles.
 */
export function requireRole(...allowedRoles: AllowedRole[]): MiddlewareHandler {
  return async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          error: "Unauthorized",
          message: "Authentication required before role verification.",
        },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: '${user.role}'`,
        },
        403
      );
    }

    return await next();
  };
}
