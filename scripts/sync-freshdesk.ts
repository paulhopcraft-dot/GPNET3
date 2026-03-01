import "dotenv/config";
import { FreshdeskService } from "../server/services/freshdesk";
import { storage } from "../server/storage";
import { logger } from "../server/lib/logger";

async function syncFreshdesk() {
  try {
    console.log("🔄 Starting Freshdesk sync...");
    console.log(`📍 Domain: ${process.env.FRESHDESK_DOMAIN}`);

    const freshdesk = new FreshdeskService();

    console.log("📥 Fetching tickets from Freshdesk...");
    const tickets = await freshdesk.fetchTickets();
    console.log(`✅ Fetched ${tickets.length} tickets`);

    console.log("🔄 Transforming tickets to worker cases...");
    const workerCases = await freshdesk.transformTicketsToWorkerCases(tickets);
    console.log(`✅ Transformed into ${workerCases.length} worker cases`);

    console.log("💾 Syncing to database...");
    let synced = 0;
    for (const workerCase of workerCases) {
      await storage.syncWorkerCaseFromFreshdesk(workerCase);
      synced++;
      if (synced % 10 === 0) {
        console.log(`   Synced ${synced}/${workerCases.length} cases...`);
      }
    }

    console.log(`\n✅ Sync complete!`);
    console.log(`   Tickets fetched: ${tickets.length}`);
    console.log(`   Cases synced: ${synced}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

syncFreshdesk();
