import { testConnection } from "../config/db";
import { env } from "../config/env";

async function main() {
  console.log("🔍 Checking StockSense database connection...");
  console.log(`📡 Target endpoint: ${env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`);

  const result = await testConnection();

  if (result.ok) {
    console.log("✅ Database connection successful!");
    console.log(`🕒 Server database time: ${result.timestamp}`);
    process.exit(0);
  } else {
    console.error("❌ Database connection failed:");
    console.error(result.error);
    console.log("\n💡 Tips:");
    console.log("1. Ensure your DATABASE_URL in 'stocksense-api/.env' is correct.");
    console.log("2. For Neon Postgres, verify your project is not paused and uses the pooled connection string.");
    console.log("3. For local PostgreSQL, verify PostgreSQL service is running on your system.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
