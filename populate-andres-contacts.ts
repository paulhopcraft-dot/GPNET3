// Populate contacts for Andres Nieto case (FD-43714)
// Based on user provided contact list

async function populateAndresContacts() {
  console.log('🔄 Populating contacts for Andres Nieto (FD-43714)...\n');

  // Expected contacts from user
  const contacts = [
    {
      role: "worker",
      name: "Andres Gutierrez",
      email: "andresgutini77@gmail.com",
      phone: "0473 208 394",
      company: "",
      notes: "Primary worker",
      isPrimary: true
    },
    {
      role: "employer_primary",
      name: "Saurav Kansakar",
      email: "SauravK@symmetryhr.com.au",
      phone: "03 9566 2416",
      company: "Symmetry HR",
      notes: "CFO",
      isPrimary: true
    },
    {
      role: "employer_secondary",
      name: "Michelle Clarkson",
      email: "MichelleC@symmetryhr.com.au",
      phone: "",
      company: "Symmetry HR",
      notes: "",
      isPrimary: false
    },
    {
      role: "case_manager",
      name: "Niko Datuin",
      email: "lorenznikolay.datuin@dxc.com",
      phone: "03 9947 6289",
      company: "DXC",
      notes: "",
      isPrimary: true
    },
    {
      role: "orp",
      name: "Jordan Pankiw",
      email: "jpankiw@amsconsulting.com.au",
      phone: "0412 251 372",
      company: "AMS Consulting",
      notes: "",
      isPrimary: true
    },
    {
      role: "physiotherapist",
      name: "Andrew Coulter",
      email: "",
      phone: "",
      company: "Hobsons Bay Medical",
      notes: "",
      isPrimary: true
    },
    {
      role: "treating_gp",
      name: "Dr. Caesar Tan",
      email: "",
      phone: "",
      company: "",
      notes: "",
      isPrimary: true
    },
    {
      role: "gpnet",
      name: "Jacinta Bailey",
      email: "jacinta.bailey@gpnet.au",
      phone: "",
      company: "GPNet",
      notes: "",
      isPrimary: true
    }
  ];

  // First, authenticate to get session cookie
  console.log('1. Authenticating...');

  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'employer@symmetry.local',
      password: 'ChangeMe123!'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed');
    return;
  }

  console.log('✅ Login successful');

  // Extract auth cookie
  const cookieHeader = loginResponse.headers.get('set-cookie');
  const tokenMatch = cookieHeader?.match(/gpnet_auth=([^;]+)/);
  if (!tokenMatch) {
    console.log('❌ No token found');
    return;
  }

  const token = tokenMatch[1];
  console.log('✅ Token extracted:', token.substring(0, 20) + '...');

  // Get CSRF token from the proper endpoint
  console.log('\n2. Getting CSRF token...');
  const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
    headers: {
      'Cookie': `gpnet_auth=${token}`,
    },
    credentials: 'include'
  });

  if (!csrfResponse.ok) {
    console.log('❌ Failed to get CSRF token:', csrfResponse.status);
    const errorText = await csrfResponse.text();
    console.log('Error:', errorText);
    return;
  }

  const csrfData = await csrfResponse.json();
  const csrfToken = csrfData.data?.csrfToken;
  console.log('✅ CSRF token obtained:', csrfToken?.substring(0, 20) + '...');

  // Now add each contact
  console.log('\n3. Adding contacts...');
  let successCount = 0;

  for (const contact of contacts) {
    console.log(`Adding ${contact.name} (${contact.role})...`);

    const contactResponse = await fetch('http://localhost:5000/api/cases/FD-43714/contacts', {
      method: 'POST',
      headers: {
        'Cookie': `gpnet_auth=${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify(contact),
      credentials: 'include'
    });

    if (contactResponse.ok) {
      console.log(`✅ Added ${contact.name}`);
      successCount++;
    } else {
      const errorText = await contactResponse.text();
      console.log(`❌ Failed to add ${contact.name}: ${contactResponse.status} ${errorText}`);
    }
  }

  console.log(`\n📋 Summary:`);
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${contacts.length - successCount}`);

  if (successCount === contacts.length) {
    console.log('\n🎉 All contacts added successfully!');
    console.log('The Contacts tab for Andres Nieto should now display all key contacts.');
  }
}

populateAndresContacts().catch(console.error);