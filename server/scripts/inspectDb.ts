import { sql } from "drizzle-orm";
import { db } from "../db";

async function inspect() {
  console.log("=== TABLES ===");
  const tables = await db.execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  console.log(tables.rows);

  console.log("\n=== COLUMNS (workers/cases/medical_certificates/transcripts) ===");
  const target = ['workers', 'cases', 'medical_certificates', 'transcripts'];
  for (const t of target) {
    const cols = await db.execute(
      sql`SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = ${t}`
    );
    console.log(`\nTable: ${t}`);
    console.log(cols.rows);
  }

  console.log("\n=== FOREIGN KEYS ===");
  const fks = await db.execute(sql`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS referenced_table,
      ccu.column_name AS referenced_column
    FROM 
      information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
  `);

  console.log(fks.rows);
}

inspect()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
