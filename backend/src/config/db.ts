import { drizzle } from "drizzle-orm/node-postgres";
import dns from "node:dns";
import net from "node:net";
import pg from "pg";
import * as schema from "../db/schema/index";
import { env } from "./env";

// Ensure Node.js prioritizes IPv4 over IPv6 on networks without IPv6 gateways
dns.setDefaultResultOrder("ipv4first");

/**
 * Creates and exports a pooled database connection and Drizzle ORM instance.
 * Uses standard node-postgres Pool with TLS and custom socket configuration
 * (autoSelectFamily: false) to prevent IPv6 timeout hangs on Windows/AWS environments.
 */
const isLocal = env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("127.0.0.1");

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  stream: () => {
    const socket = new net.Socket();
    const origConnect = socket.connect.bind(socket);
    // Explicitly disable happy-eyeballs IPv6 hang on Windows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.connect = function (port: any, host?: any, cb?: any) {
      if (typeof port === "object") {
        return origConnect({ ...port, autoSelectFamily: false }, host);
      }
      return origConnect({ port, host, autoSelectFamily: false }, cb);
    };
    return socket;
  },
});

export const db = drizzle(pool, { schema });

/**
 * Health check helper to verify database connectivity.
 */
export async function testConnection(): Promise<{ ok: boolean; timestamp?: string; error?: string }> {
  try {
    const client = await pool.connect();
    try {
      const res = await client.query("SELECT NOW() as now, current_database() as db;");
      return { ok: true, timestamp: res.rows[0]?.now };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: errorMsg };
  }
}
