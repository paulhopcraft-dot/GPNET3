import { spawn } from "node:child_process";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { organizations } from "@shared/schema";
import { logger } from "./lib/logger";

/**
 * Demo-only auto-seed gate.
 *
 * On boot, checks for a canary organization id from the WorkBetter partner
 * roster (`org-wb-abacus-energy`). If absent, spawns
 * `npx tsx server/seed-workbetter.ts` to populate prod with demo data
 * (Alpine fixtures + 106 WorkBetter clients + realistic Australian worker
 * names and injury descriptions). The seed itself is idempotent and the
 * canary check makes this self-gating — it flips off after first success.
 *
 * Boot is never blocked: errors are logged and swallowed, the spawn is
 * non-blocking, and a partial seed is recovered by the seed's own
 * delete-then-insert cleanup on a subsequent run.
 *
 * REMOVE THIS FILE + its call from server/index.ts after the partner-tier
 * demo lands. It exists only to bridge the gap between merging the seed
 * and being able to run `npm run seed:workbetter` directly on prod.
 */
export async function autoSeedPartnerIfMissing(): Promise<void> {
  try {
    const canary = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, "org-wb-abacus-energy"))
      .limit(1);

    if (canary.length > 0) {
      logger.server.info(
        "[auto-seed] WorkBetter partner roster present, skipping seed",
      );
      return;
    }

    logger.server.info(
      "[auto-seed] WorkBetter partner roster missing — spawning seed:workbetter",
    );
    const child = spawn("npx", ["tsx", "server/seed-workbetter.ts"], {
      cwd: process.cwd(),
      stdio: "inherit",
      detached: false,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        logger.server.info(
          "[auto-seed] seed:workbetter exited 0 — demo data live",
        );
      } else {
        logger.server.error(
          "[auto-seed] seed:workbetter exited non-zero",
          { code },
        );
      }
    });
    child.on("error", (err) => {
      logger.server.error(
        "[auto-seed] seed:workbetter failed to spawn",
        {},
        err,
      );
    });
  } catch (err) {
    logger.server.error(
      "[auto-seed] gate failed (continuing boot)",
      {},
      err,
    );
  }
}
