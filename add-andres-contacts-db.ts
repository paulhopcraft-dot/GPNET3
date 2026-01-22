// Add contacts directly to database for Andres Nieto case (FD-43714)
import { db } from './server/db.js';
import { caseContacts } from './shared/schema.js';

async function addAndresContactsDb() {
  console.log('🔄 Adding contacts directly to database for Andres Nieto (FD-43714)...\n');

  // Expected contacts from user
  const contacts = [
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha', // This should match the organization from case data
      role: 'worker',
      name: 'Andres Gutierrez',
      email: 'andresgutini77@gmail.com',
      phone: '0473 208 394',
      company: '',
      notes: 'Primary worker',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'employer_primary',
      name: 'Saurav Kansakar',
      email: 'SauravK@symmetryhr.com.au',
      phone: '03 9566 2416',
      company: 'Symmetry HR',
      notes: 'CFO',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'employer_secondary',
      name: 'Michelle Clarkson',
      email: 'MichelleC@symmetryhr.com.au',
      phone: '',
      company: 'Symmetry HR',
      notes: '',
      isPrimary: false
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'case_manager',
      name: 'Niko Datuin',
      email: 'lorenznikolay.datuin@dxc.com',
      phone: '03 9947 6289',
      company: 'DXC',
      notes: '',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'orp',
      name: 'Jordan Pankiw',
      email: 'jpankiw@amsconsulting.com.au',
      phone: '0412 251 372',
      company: 'AMS Consulting',
      notes: '',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'physiotherapist',
      name: 'Andrew Coulter',
      email: '',
      phone: '',
      company: 'Hobsons Bay Medical',
      notes: '',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'treating_gp',
      name: 'Dr. Caesar Tan',
      email: '',
      phone: '',
      company: '',
      notes: '',
      isPrimary: true
    },
    {
      caseId: 'FD-43714',
      organizationId: 'org-alpha',
      role: 'gpnet',
      name: 'Jacinta Bailey',
      email: 'jacinta.bailey@gpnet.au',
      phone: '',
      company: 'GPNet',
      notes: '',
      isPrimary: true
    }
  ];

  console.log('📝 Inserting contacts into case_contacts table...\n');

  let successCount = 0;

  for (const contact of contacts) {
    try {
      console.log(`Adding ${contact.name} (${contact.role})...`);

      const result = await db.insert(caseContacts).values(contact).returning();

      if (result.length > 0) {
        console.log(`✅ Added ${contact.name} with ID: ${result[0].id}`);
        successCount++;
      } else {
        console.log(`❌ Failed to add ${contact.name}: No result returned`);
      }
    } catch (error) {
      console.log(`❌ Failed to add ${contact.name}:`, error);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${contacts.length - successCount}`);

  if (successCount === contacts.length) {
    console.log('\n🎉 All contacts added successfully!');
    console.log('The Contacts tab for Andres Nieto should now display all key contacts.');
  } else if (successCount > 0) {
    console.log(`\n⚠️ Partial success: ${successCount} out of ${contacts.length} contacts added.`);
  } else {
    console.log('\n❌ No contacts were added. Check database connection and case ID.');
  }
}

addAndresContactsDb()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });