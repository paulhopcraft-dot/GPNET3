import 'dotenv/config';
import { drizzle } from 'drizzle-orm/pg-node';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);
