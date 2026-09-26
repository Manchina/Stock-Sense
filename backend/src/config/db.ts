import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "../db/schema/index";
import { env } from "./env";

// Setup WebSocket constructor for Neon serverless in Node.js runtimes
neonConfig.webSocketConstructor = ws;

/**
 * Creates and exports a pooled database connection and Drizzle ORM instance.
 * Automatically chooses between Neon Serverless Pool (for Neon endpoints)
 * and standard node-postgres Pool (for local Postgres or standard instances).
 */
const isNeon = env.DATABASE_URL.includes("neon.tech");

let poolInstance: NeonPool | pg.Pool;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let dbInstance: any;

if (isNeon) {
  const neonPool = new NeonPool({
    connectionString: env.DATABASE_URL,
  });
  poolInstance = neonPool;
  dbInstance = drizzleNeon(neonPool, { schema });
} else {
  const nodePool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  poolInstance = nodePool;
  dbInstance = drizzlePg(nodePool, { schema });
}

export const pool = poolInstance;
export const db = dbInstance as ReturnType<typeof drizzleNeon<typeof schema>>;

/**
 * Health check helper to verify database connectivity.
 */
export async function testConnection(): Promise<{ ok: boolean; timestamp?: string; error?: string }> {
  try {
    const client = await (pool as pg.Pool).connect();
    try {
      const res = await client.query("SELECT NOW() as now;");
      return { ok: true, timestamp: res.rows[0]?.now };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    let errorMsg: string;
    if (err instanceof Error) {
      errorMsg = err.message;
    } else if (typeof err === "object" && err !== null) {
      const anyErr = err as Record<string, unknown>;
      errorMsg =
        (anyErr.message as string) ||
        (anyErr.reason as string) ||
        (anyErr.code as string) ||
        String(err);
      if (errorMsg === "[object Object]" || errorMsg === "{}") {
        errorMsg = "Unable to reach database host (connection timeout / unresolvable placeholder host)";
      }
    } else {
      errorMsg = String(err);
    }
    return { ok: false, error: errorMsg };
  }
}
