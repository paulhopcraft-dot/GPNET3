import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// Allow running without database for frontend testing
export const USE_MOCK_DB = !process.env.DATABASE_URL;

if (USE_MOCK_DB) {
  console.warn("[DB] Running in MOCK mode - no database connection");
}

export const pool = USE_MOCK_DB
  ? (null as unknown as Pool)
  : new Pool({ connectionString: process.env.DATABASE_URL });

export const db = USE_MOCK_DB
  ? (null as unknown as ReturnType<typeof drizzle>)
  : drizzle(pool!, { schema });
