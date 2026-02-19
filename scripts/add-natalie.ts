/**
 * Add Natalie's user account to the existing database.
 * Run: npx tsx scripts/add-natalie.ts
 */
import { db } from "../server/db";
import { users } from "../shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function addNatalie(): Promise<void> {
  const email = "natalie@preventli.com";

  // Check if already exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.log(`User ${email} already exists (id: ${existing[0].id})`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const [newUser] = await db.insert(users).values({
    id: randomUUID(),
    organizationId: "org-alpha",
    email,
    password: passwordHash,
    role: "employer",
    subrole: "rtw-coordinator",
    companyId: "empl-symmetry",
    insurerId: null,
  }).returning();

  console.log(`Created user: ${newUser.email} (id: ${newUser.id})`);
  console.log(`Login: ${email} / ChangeMe123!`);
  process.exit(0);
}

addNatalie().catch((err) => {
  console.error("Failed to add user:", err);
  process.exit(1);
});
