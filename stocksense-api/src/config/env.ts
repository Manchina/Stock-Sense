import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// Load .env file from project root or package directory
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "stocksense-api/.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long").default("stocksense_super_secret_jwt_key_2026_dev_mode_change_in_prod"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters long").default("stocksense_super_secret_refresh_jwt_key_2026_dev_mode_change_in_prod"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = parseEnv();
