import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

/**
 * Global application error handler.
 * Formats Zod validation errors, Hono HTTP exceptions, and unexpected server errors uniformly.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return c.json(
      {
        error: "Validation Error",
        message: "Invalid request payload",
        details: formattedErrors,
      },
      400
    );
  }

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.name || "HTTP Error",
        message: err.message,
      },
      err.status
    );
  }

  console.error("💥 Unhandled Error:", err);

  return c.json(
    {
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "An unexpected server error occurred",
    },
    500
  );
};
