import "dotenv/config";
import { db } from "../server/db";
import { workerCases } from "../shared/schema";
import { isLegitimateCase } from "../shared/schema";

async function countLegitimateCases() {
  console.log("\n=== Counting legitimate cases ===\n");

  // Get all cases
  const allCases = await db.select({
    id: workerCases.id,
    workerName: workerCases.workerName,
    company: workerCases.company,
    dateOfInjury: workerCases.dateOfInjury,
  })
  .from(workerCases);

  console.log(`Total cases in database: ${allCases.length}`);

  // Filter legitimate cases
  const legitimateCases = allCases.filter(c => isLegitimateCase(c));

  console.log(`Legitimate cases after filter: ${legitimateCases.length}`);
  console.log(`Filtered out (fake/test): ${allCases.length - legitimateCases.length}`);

  // Show breakdown by company
  const companyCounts = new Map<string, number>();
  for (const c of legitimateCases) {
    companyCounts.set(c.company, (companyCounts.get(c.company) || 0) + 1);
  }

  console.log("\nLegitimate cases by company:");
  Array.from(companyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([company, count]) => {
      console.log(`  ${company}: ${count} cases`);
    });

  process.exit(0);
}

countLegitimateCases().catch(console.error);
