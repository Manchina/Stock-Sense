import { migrate } from "drizzle-orm/node-postgres/migrator";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, pool } from "../config/db";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log("⏳ Applying database migrations to Neon PostgreSQL...");
  try {
    const migrationsFolder = resolve(__dirname, "migrations");
    await migrate(db, { migrationsFolder });
    console.log("✅ All migrations applied successfully to Neon!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
