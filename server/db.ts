import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Production-safe pool settings
  max: parseInt(process.env.DB_POOL_MAX ?? "20", 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? "30000", 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT ?? "5000", 10),
  // SSL required for managed databases (RDS, Neon, Supabase, etc.)
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
});

// Log pool errors (connection failures, timeouts) without crashing the server
pool.on("error", (err) => {
  console.error("[Database] Pool error:", err.message);
});

export const db = drizzle(pool, { schema });
