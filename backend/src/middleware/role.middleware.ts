import type { MiddlewareHandler } from "hono";

export type AllowedRole = "super_admin" | "inventory_manager" | "warehouse_staff";

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user possesses one of the allowed roles.
 * Super Admins possess master privileges and automatically bypass all role restrictions.
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

    // Super Admin has master bypass access to all endpoints
    if (user.role === "super_admin") {
      return await next();
    }

    if (!allowedRoles.includes(user.role as AllowedRole)) {
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

/**
 * Guard that restricts endpoint strictly to Super Admins.
 */
export function requireSuperAdmin(): MiddlewareHandler {
  return requireRole("super_admin");
}
