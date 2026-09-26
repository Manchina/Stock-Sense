import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

// Support running drizzle-kit from either root or stocksense-api folder
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "stocksense-api/.env") });

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
