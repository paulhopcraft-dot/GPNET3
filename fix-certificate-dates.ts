import "dotenv/config";
import { db } from "./server/db";
import { medicalCertificates, caseActions, workerCases } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";

async function fixCertificateDates() {
  try {
    console.log("🔧 FIXING JULY 2026 CERTIFICATE DATE CORRUPTION");
    console.log("=================================================\n");

    // Find all certificates with July 2026 dates (clearly corrupted future dates)
    console.log("🔍 Searching for certificates with July 2026 dates...");

    const corruptedCertificates = await db.select({
      id: medicalCertificates.id,
      caseId: medicalCertificates.caseId,
      startDate: medicalCertificates.startDate,
      endDate: medicalCertificates.endDate,
      capacity: medicalCertificates.capacity,
      createdAt: medicalCertificates.createdAt,
      claimantName: workerCases.claimantName,
      company: workerCases.company
    })
    .from(medicalCertificates)
    .leftJoin(workerCases, eq(medicalCertificates.caseId, workerCases.id))
    .where(
      or(
        like(medicalCertificates.startDate, "%2026-07-%"),
        like(medicalCertificates.startDate, "%/07/2026%"),
        like(medicalCertificates.endDate, "%2026-07-%"),
        like(medicalCertificates.endDate, "%/07/2026%")
      )
    );

    console.log(`📋 Found ${corruptedCertificates.length} certificates with July 2026 dates:`);

    if (corruptedCertificates.length === 0) {
      console.log("✅ No July 2026 certificate dates found!");
    } else {
      // Display the problematic certificates
      corruptedCertificates.forEach((cert, index) => {
        console.log(`\n📋 Certificate ${index + 1}:`);
        console.log(`   ID: ${cert.id}`);
        console.log(`   Worker: ${cert.claimantName || 'Unknown'}`);
        console.log(`   Company: ${cert.company || 'Unknown'}`);
        console.log(`   Start Date: ${cert.startDate} ❌`);
        console.log(`   End Date: ${cert.endDate} ❌`);
        console.log(`   Created: ${cert.createdAt}`);
      });

      // Fix strategy: Convert July 2026 to July 2025 (likely the correct year)
      console.log("\n🔧 Applying fixes...");
      let fixedCount = 0;

      for (const cert of corruptedCertificates) {
        let updatedStartDate = cert.startDate;
        let updatedEndDate = cert.endDate;

        // Convert 2026-07 to 2025-07
        if (cert.startDate.includes("2026-07")) {
          updatedStartDate = cert.startDate.replace("2026-07", "2025-07");
        } else if (cert.startDate.includes("/07/2026")) {
          updatedStartDate = cert.startDate.replace("/07/2026", "/07/2025");
        }

        if (cert.endDate.includes("2026-07")) {
          updatedEndDate = cert.endDate.replace("2026-07", "2025-07");
        } else if (cert.endDate.includes("/07/2026")) {
          updatedEndDate = cert.endDate.replace("/07/2026", "/07/2025");
        }

        // Only update if we made changes
        if (updatedStartDate !== cert.startDate || updatedEndDate !== cert.endDate) {
          await db.update(medicalCertificates)
            .set({
              startDate: updatedStartDate,
              endDate: updatedEndDate,
              updatedAt: new Date()
            })
            .where(eq(medicalCertificates.id, cert.id));

          console.log(`✅ Fixed certificate for ${cert.claimantName}:`);
          console.log(`   Start: ${cert.startDate} → ${updatedStartDate}`);
          console.log(`   End: ${cert.endDate} → ${updatedEndDate}`);
          fixedCount++;
        }
      }

      console.log(`\n📊 Fixed ${fixedCount} certificates!`);
    }

    // Now fix any related case actions that reference July 2026
    console.log("\n🔍 Searching for case actions with July 2026 references...");

    const corruptedActions = await db.select()
      .from(caseActions)
      .where(
        or(
          like(caseActions.dueDate, "%2026-07-%"),
          like(caseActions.dueDate, "%/07/2026%"),
          like(caseActions.description, "%01/07/2026%"),
          like(caseActions.description, "%2026-07-%")
        )
      );

    console.log(`📋 Found ${corruptedActions.length} case actions with July 2026 references`);

    let fixedActionsCount = 0;
    for (const action of corruptedActions) {
      let updatedDueDate = action.dueDate;
      let updatedDescription = action.description;
      let hasChanges = false;

      // Fix due date
      if (action.dueDate) {
        if (action.dueDate.includes("2026-07")) {
          updatedDueDate = action.dueDate.replace("2026-07", "2025-07");
          hasChanges = true;
        } else if (action.dueDate.includes("/07/2026")) {
          updatedDueDate = action.dueDate.replace("/07/2026", "/07/2025");
          hasChanges = true;
        }
      }

      // Fix description text
      if (action.description) {
        const originalDesc = action.description;
        updatedDescription = action.description
          .replace(/01\/07\/2026/g, "01/07/2025")
          .replace(/2026-07/g, "2025-07");

        if (originalDesc !== updatedDescription) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await db.update(caseActions)
          .set({
            dueDate: updatedDueDate,
            description: updatedDescription,
            updatedAt: new Date()
          })
          .where(eq(caseActions.id, action.id));

        console.log(`✅ Fixed case action ${action.id}:`);
        if (action.dueDate !== updatedDueDate) {
          console.log(`   Due Date: ${action.dueDate} → ${updatedDueDate}`);
        }
        if (action.description !== updatedDescription) {
          console.log(`   Updated description to remove 2026 references`);
        }
        fixedActionsCount++;
      }
    }

    console.log("\n✅ CERTIFICATE DATE CORRUPTION FIX COMPLETED!");
    console.log("================================================");
    console.log(`📊 Summary:`);
    console.log(`   - Fixed ${fixedCount} medical certificates`);
    console.log(`   - Fixed ${fixedActionsCount} case actions`);
    console.log(`   - All July 2026 dates converted to July 2025`);
    console.log(`   - Action queue calculations should now be correct\n`);

  } catch (error) {
    console.error("❌ Error fixing certificate dates:", error);
  }
}

fixCertificateDates();