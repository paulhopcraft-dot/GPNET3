import "dotenv/config";
import { db } from "../server/db";
import { workerCases } from "../shared/schema";
import { like, or } from "drizzle-orm";

async function checkFakeCases() {
  console.log("\n=== Checking for fake worker cases ===\n");

  // Check for Symmetry Manufacturing
  const symmetryCases = await db.select({
    id: workerCases.id,
    workerName: workerCases.workerName,
    company: workerCases.company,
    caseStatus: workerCases.caseStatus,
  })
  .from(workerCases)
  .where(like(workerCases.company, "%Symmetry%"));

  console.log(`Found ${symmetryCases.length} Symmetry Manufacturing cases:`);
  symmetryCases.forEach(c => console.log(`  - ${c.workerName} (${c.company}) [${c.id}]`));

  // Check for Workcover cases
  const workcoverCases = await db.select({
    id: workerCases.id,
    workerName: workerCases.workerName,
    company: workerCases.company,
    caseStatus: workerCases.caseStatus,
  })
  .from(workerCases)
  .where(like(workerCases.workerName, "%Workcover%"));

  console.log(`\nFound ${workcoverCases.length} Workcover cases:`);
  workcoverCases.forEach(c => console.log(`  - ${c.workerName} (${c.company}) [${c.id}]`));

  // Check for Unknown Company
  const unknownCases = await db.select({
    id: workerCases.id,
    workerName: workerCases.workerName,
    company: workerCases.company,
    caseStatus: workerCases.caseStatus,
  })
  .from(workerCases)
  .where(like(workerCases.company, "%Unknown%"));

  console.log(`\nFound ${unknownCases.length} Unknown Company cases:`);
  unknownCases.forEach(c => console.log(`  - ${c.workerName} (${c.company}) [${c.id}]`));

  console.log(`\n=== Total fake cases: ${symmetryCases.length + workcoverCases.length + unknownCases.length} ===\n`);

  process.exit(0);
}

checkFakeCases().catch(console.error);
