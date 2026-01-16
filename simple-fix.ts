import "dotenv/config";
import { db } from "./server/db";
import { medicalCertificates, caseActions } from "@shared/schema";
import { eq, like, or } from "drizzle-orm";

async function simpleFix() {
  try {
    console.log("🔧 Fixing July 2026 certificate dates...\n");

    // Simple query for certificates
    const certs = await db.select()
      .from(medicalCertificates);

    console.log(`Found ${certs.length} total certificates`);

    let fixedCerts = 0;
    for (const cert of certs) {
      let needsUpdate = false;
      let newStartDate = cert.startDate;
      let newEndDate = cert.endDate;

      // Convert dates to strings for checking
      const startDateStr = cert.startDate ? cert.startDate.toString() : '';
      const endDateStr = cert.endDate ? cert.endDate.toString() : '';

      // Check for 2026-07 patterns and fix them
      if (startDateStr.includes("2026") && startDateStr.includes("Jan")) {
        // Convert 2026 January to 2025 July (the likely intended date)
        const originalDate = new Date(cert.startDate);
        const fixedDate = new Date(2025, 6, originalDate.getDate()); // July = month 6
        newStartDate = fixedDate;
        needsUpdate = true;
        console.log(`📋 Fixing certificate ${cert.id} start date: ${startDateStr} → ${fixedDate.toISOString()}`);
      }

      if (endDateStr.includes("2026") && endDateStr.includes("Jan")) {
        // Convert 2026 January to 2025 July (the likely intended date)
        const originalDate = new Date(cert.endDate);
        const fixedDate = new Date(2025, 6, originalDate.getDate()); // July = month 6
        newEndDate = fixedDate;
        needsUpdate = true;
        console.log(`📋 Fixing certificate ${cert.id} end date: ${endDateStr} → ${fixedDate.toISOString()}`);
      }

      if (needsUpdate) {
        await db.update(medicalCertificates)
          .set({
            startDate: newStartDate,
            endDate: newEndDate,
            updatedAt: new Date()
          })
          .where(eq(medicalCertificates.id, cert.id));

        fixedCerts++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCerts} certificates`);

    // Fix case actions
    const actions = await db.select().from(caseActions);
    console.log(`\nChecking ${actions.length} case actions...`);

    let fixedActions = 0;
    for (const action of actions) {
      let needsUpdate = false;
      let newDueDate = action.dueDate;
      let newDescription = action.description;

      // Fix due dates (convert to string first)
      const dueDateStr = action.dueDate ? action.dueDate.toString() : '';
      if (dueDateStr.includes("2026") && dueDateStr.includes("Jan")) {
        const originalDate = new Date(action.dueDate);
        const fixedDate = new Date(2025, 6, originalDate.getDate()); // July = month 6
        newDueDate = fixedDate;
        needsUpdate = true;
        console.log(`📋 Fixed action due date: ${dueDateStr} → ${fixedDate.toISOString()}`);
      }

      // Fix descriptions
      if (action.description) {
        const originalDesc = action.description;
        newDescription = action.description
          .replace(/01\/07\/2026/g, "01/07/2025")
          .replace(/2026-07-01/g, "2025-07-01");

        if (originalDesc !== newDescription) {
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await db.update(caseActions)
          .set({
            dueDate: newDueDate,
            description: newDescription,
            updatedAt: new Date()
          })
          .where(eq(caseActions.id, action.id));

        fixedActions++;
        console.log(`📋 Fixed action ${action.id}`);
      }
    }

    console.log(`\n✅ Fixed ${fixedActions} case actions`);
    console.log(`\n🎉 Fix completed! Fixed ${fixedCerts} certificates and ${fixedActions} actions`);

  } catch (error) {
    console.error("Error:", error);
  }
}

simpleFix();