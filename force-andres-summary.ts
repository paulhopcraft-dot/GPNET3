// Force regenerate AI summary for Andres Nieto (FD-43714)
// Using the API approach since backend is running

async function forceAndresSummary() {
  console.log('🔄 Forcing fresh AI summary generation for Andres Nieto (FD-43714)...\n');

  // First, let's try to get an auth token by logging in as an admin
  console.log('1. Attempting to authenticate...');

  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@preventli.com',
      password: 'AdminTest123!' // Try admin account
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Admin login failed, trying employer account...');

    // Try employer account
    const employerLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'employer@symmetry.local',
        password: 'ChangeMe123!'
      })
    });

    if (!employerLogin.ok) {
      console.log('❌ Both login attempts failed');
      return;
    }

    console.log('✅ Employer login successful');

    // Get token from cookies or response
    const cookieHeader = employerLogin.headers.get('set-cookie');
    console.log('Cookie header:', cookieHeader);

    // Extract token from cookie
    const tokenMatch = cookieHeader?.match(/gpnet_auth=([^;]+)/);
    if (!tokenMatch) {
      console.log('❌ No token found in response');
      return;
    }

    const token = tokenMatch[1];
    console.log('✅ Token extracted:', token.substring(0, 20) + '...');

    // Now force regenerate summary
    console.log('\n2. Forcing summary regeneration...');
    const summaryResponse = await fetch('http://localhost:5000/api/cases/FD-43714/summary?force=true', {
      method: 'POST',
      headers: {
        'Cookie': `gpnet_auth=${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      console.log('✅ Summary regenerated successfully!');
      console.log('Summary length:', summaryData.summary?.length || 0, 'characters');
      console.log('First 200 characters:', summaryData.summary?.substring(0, 200) + '...');
    } else {
      console.log('❌ Summary regeneration failed:', summaryResponse.status, summaryResponse.statusText);
      const error = await summaryResponse.text();
      console.log('Error details:', error);
    }

  } else {
    console.log('✅ Admin login successful - proceed with admin token');
    // Similar logic for admin token
  }
}

forceAndresSummary().catch(console.error);