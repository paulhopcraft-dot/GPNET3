/**
 * Create an employer user for testing
 */

import "dotenv/config";
import { db } from '../server/db';
import { users } from '../shared/schema';
import bcrypt from 'bcrypt';

const email = process.argv[2] || 'employer@test.com';
const password = process.argv[3] || 'password123';
const orgId = process.argv[4] || 'org-alpha'; // Default to Symmetry Manufacturing

async function createEmployerUser() {
  console.log(`\n🔧 Creating employer user...\n`);
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Organization: ${orgId}\n`);

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const [newUser] = await db.insert(users).values({
      email,
      password: hashedPassword,
      role: 'employer',
      organizationId: orgId,
      isActive: true,
    }).returning();

    console.log(`✅ Employer user created successfully!\n`);
    console.log(`   User ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Organization: ${newUser.organizationId}\n`);
    console.log(`🌐 You can now login at: http://localhost:5000`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}\n`);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        console.error(`❌ User with email ${email} already exists for organization ${orgId}`);
        console.log(`\n💡 Try logging in with existing credentials, or use a different email:\n`);
        console.log(`   npx tsx scripts/create-employer-user.ts employer2@test.com password123 org-alpha\n`);
      } else {
        console.error('❌ Error:', error.message);
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

createEmployerUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
