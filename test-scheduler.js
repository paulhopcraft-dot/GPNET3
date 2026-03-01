/**
 * Test script for the sync scheduler
 * Tests both the status endpoint and manual trigger
 */

const API_BASE = 'http://localhost:5000';

async function login() {
  console.log('🔐 Logging in...');
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@gpnet.local',
      password: 'ChangeMe123!'
    }),
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('✅ Logged in successfully');
  return data.token;
}

async function checkSchedulerStatus(token) {
  console.log('\n📊 Checking scheduler status...');
  const response = await fetch(`${API_BASE}/api/sync/status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  const status = await response.json();
  console.log('Scheduler Status:', JSON.stringify(status, null, 2));
  return status;
}

async function triggerManualSync(token) {
  console.log('\n🔄 Triggering manual sync...');
  const response = await fetch(`${API_BASE}/api/sync/trigger`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Manual sync failed: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  console.log('Sync Result:', JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  try {
    const token = await login();

    // Check initial status
    await checkSchedulerStatus(token);

    // Optionally trigger a manual sync (uncomment to test)
    // console.log('\n⚠️  Manual sync can take a while. Uncomment the line below to test.');
    // await triggerManualSync(token);

    console.log('\n✅ All scheduler tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
