import "dotenv/config";
import { db } from "../server/db";
import { workerCases } from "../shared/schema";
import { isLegitimateCase } from "../shared/schema";
import { like } from "drizzle-orm";

async function checkWorkcover() {
  const cases = await db.select().from(workerCases).where(like(workerCases.workerName, "%Workcover%"));

  console.log(`\nCases with "Workcover" in name: ${cases.length}\n`);

  cases.forEach(c => {
    const legit = isLegitimateCase(c);
    console.log(`  - ${c.workerName} (${c.company}) - Legitimate: ${legit}`);
  });

  process.exit(0);
}

checkWorkcover().catch(console.error);
