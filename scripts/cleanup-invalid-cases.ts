/**
 * Cleanup Invalid Cases Script
 *
 * This script identifies and marks invalid worker cases as closed.
 * Invalid cases are those that don't represent real worker injury cases,
 * such as administrative entries, email subjects, test data, etc.
 *
 * Usage: npx tsx scripts/cleanup-invalid-cases.ts [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Preview which cases would be marked as closed without making changes
 *   --force    Skip confirmation prompt and execute cleanup immediately
 */

// Load environment variables
import "dotenv/config";

import { db } from "../server/db";
import { workerCases, isLegitimateCase } from "../shared/schema";
import { eq } from "drizzle-orm";

interface WorkerCaseRow {
  id: string;
  workerName: string;
  company: string;
  dateOfInjury: Date | null;
  caseStatus: string | null;
}

async function identifyInvalidCases(): Promise<WorkerCaseRow[]> {
  const allCases = await db
    .select({
      id: workerCases.id,
      workerName: workerCases.workerName,
      company: workerCases.company,
      dateOfInjury: workerCases.dateOfInjury,
      caseStatus: workerCases.caseStatus,
    })
    .from(workerCases);

  const invalidCases: WorkerCaseRow[] = [];

  for (const caseRow of allCases) {
    // Skip already closed cases
    if (caseRow.caseStatus === "closed") {
      continue;
    }

    const isValid = isLegitimateCase({
      workerName: caseRow.workerName,
      company: caseRow.company,
      dateOfInjury: caseRow.dateOfInjury?.toISOString(),
    });

    if (!isValid) {
      invalidCases.push(caseRow);
    }
  }

  return invalidCases;
}

async function markCasesAsClosed(caseIds: string[]): Promise<number> {
  let closedCount = 0;
  const now = new Date();

  for (const caseId of caseIds) {
    try {
      await db
        .update(workerCases)
        .set({
          caseStatus: "closed",
          closedAt: now,
          closedReason: "Invalid case - not a legitimate worker injury case (automated cleanup)",
          updatedAt: now,
        })
        .where(eq(workerCases.id, caseId));
      closedCount++;
    } catch (err) {
      console.error(`Failed to close case ${caseId}:`, err);
    }
  }

  return closedCount;
}

function categorizeInvalidCase(workerName: string): string {
  const normalizedName = workerName.trim().toLowerCase();

  // Email subject patterns
  if (/^(fwd|re|fw):\s*/i.test(workerName)) {
    return "Email Subject";
  }

  // Bracket patterns
  if (workerName.includes("(") || workerName.includes("[")) {
    return "Contains Reference Number";
  }

  // Company prefix patterns
  if (/^symmetry[-\s]/i.test(workerName) || /^lower\s/i.test(workerName)) {
    return "Company Prefix";
  }

  // Administrative terms
  const adminTerms = [
    "adjustment", "work period", "welfare check", "case report",
    "rehabilitation", "transcript", "certificate", "injury"
  ];
  if (adminTerms.some((term) => normalizedName.includes(term))) {
    return "Administrative Entry";
  }

  // Action verbs / descriptions
  const actionWords = ["please", "don't", "write", "you", "new", "automatic", "formal", "how"];
  if (actionWords.some((word) => normalizedName.startsWith(word + " ") || normalizedName === word)) {
    return "Description/Action";
  }

  // Single names (insufficient identification)
  if (!normalizedName.includes(" ") && normalizedName.length < 15) {
    return "Single Name Only";
  }

  return "Other Invalid";
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isForce = args.includes("--force");

  console.log("\n===========================================");
  console.log("  INVALID CASE CLEANUP SCRIPT");
  console.log("===========================================\n");

  if (isDryRun) {
    console.log("MODE: DRY RUN (no changes will be made)\n");
  } else {
    console.log("MODE: LIVE EXECUTION\n");
  }

  console.log("Scanning for invalid cases...\n");

  const invalidCases = await identifyInvalidCases();

  if (invalidCases.length === 0) {
    console.log("No invalid cases found. Database is clean.\n");
    process.exit(0);
  }

  console.log(`Found ${invalidCases.length} invalid cases:\n`);

  // Group by category for display
  const byCategory: Record<string, WorkerCaseRow[]> = {};
  for (const caseRow of invalidCases) {
    const category = categorizeInvalidCase(caseRow.workerName);
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(caseRow);
  }

  // Display by category
  for (const [category, cases] of Object.entries(byCategory).sort()) {
    console.log(`\n--- ${category} (${cases.length}) ---`);
    for (const caseRow of cases) {
      console.log(`  [${caseRow.id}] "${caseRow.workerName}" (${caseRow.company})`);
    }
  }

  console.log("\n-------------------------------------------");
  console.log(`TOTAL: ${invalidCases.length} cases to be marked as closed`);
  console.log("-------------------------------------------\n");

  if (isDryRun) {
    console.log("DRY RUN COMPLETE - No changes were made.");
    console.log("Run without --dry-run to execute the cleanup.\n");
    process.exit(0);
  }

  // Confirmation prompt (unless --force)
  if (!isForce) {
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `\nAre you sure you want to mark ${invalidCases.length} cases as closed? (yes/no): `,
        resolve
      );
    });
    rl.close();

    if (answer.toLowerCase() !== "yes") {
      console.log("\nCleanup cancelled. No changes were made.\n");
      process.exit(0);
    }
  }

  console.log("\nExecuting cleanup...\n");

  const closedCount = await markCasesAsClosed(invalidCases.map((c) => c.id));

  console.log(`\nCleanup complete!`);
  console.log(`Successfully marked ${closedCount} cases as closed.`);

  if (closedCount < invalidCases.length) {
    console.log(`Failed to close ${invalidCases.length - closedCount} cases (see errors above).`);
  }

  console.log("\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
