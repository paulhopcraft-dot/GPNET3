/**
 * Manual compliance check trigger
 * Tests the automatic compliance checker by triggering it immediately
 */

async function triggerComplianceCheck() {
  try {
    console.log('🔍 Triggering Compliance Check\n');

    // First, login as admin to get auth token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@gpnet.local',
        password: 'ChangeMe123!'
      }),
      credentials: 'include',
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.statusText);
      return;
    }

    const authData = await loginResponse.json();
    console.log('✅ Logged in as admin\n');

    // Get CSRF token
    const csrfResponse = await fetch('http://localhost:5000/api/csrf-token', {
      credentials: 'include',
    });
    const { csrfToken } = await csrfResponse.json();

    // Trigger compliance check
    console.log('📋 Triggering manual compliance check...\n');
    const triggerResponse = await fetch('http://localhost:5000/api/compliance/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      credentials: 'include',
    });

    if (!triggerResponse.ok) {
      console.log('❌ Trigger failed:', triggerResponse.statusText);
      const error = await triggerResponse.json();
      console.log('Error:', error);
      return;
    }

    const result = await triggerResponse.json();
    console.log('✅ COMPLIANCE CHECK COMPLETE\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Success:          ${result.success}`);
    console.log(`Cases Processed:  ${result.casesProcessed}`);
    console.log(`Actions Created:  ${result.actionsCreated}`);
    console.log(`Actions Updated:  ${result.actionsUpdated}`);
    console.log(`Errors:           ${result.errors}`);
    console.log(`Timestamp:        ${result.timestamp}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Now fetch pending actions to see what was created
    console.log('📊 Fetching pending actions...\n');
    const actionsResponse = await fetch('http://localhost:5000/api/actions/pending?limit=20', {
      credentials: 'include',
    });

    if (!actionsResponse.ok) {
      console.log('❌ Failed to fetch actions:', actionsResponse.statusText);
      return;
    }

    const actionsData = await actionsResponse.json();
    const actions = actionsData.data || [];

    console.log(`✅ Found ${actions.length} pending actions:\n`);

    actions.forEach((action, i) => {
      console.log(`${i + 1}. ${action.workerName} (${action.company})`);
      console.log(`   Type: ${action.type}`);
      console.log(`   Due: ${action.dueDate || 'No due date'}`);
      console.log(`   Notes: ${action.notes || 'None'}`);
      console.log('');
    });

    // Find Andres Nieto action
    const andresAction = actions.find(a => a.workerName && a.workerName.toLowerCase().includes('nieto'));
    if (andresAction) {
      console.log('🎯 FOUND ACTION FOR ANDRES NIETO:');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Worker:   ${andresAction.workerName}`);
      console.log(`Company:  ${andresAction.company}`);
      console.log(`Type:     ${andresAction.type}`);
      console.log(`Status:   ${andresAction.status}`);
      console.log(`Due:      ${andresAction.dueDate || 'No due date'}`);
      console.log(`Notes:    ${andresAction.notes || 'None'}`);
      console.log('═══════════════════════════════════════════════════════\n');
      console.log('🎉 Compliance checker is working! Andres Nieto now has a pending action.');
    } else {
      console.log('⚠️  No action found for Andres Nieto. This may indicate:');
      console.log('    1. The case already has a compliant certificate');
      console.log('    2. The case was not processed (check logs)');
      console.log('    3. The action was already created earlier\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

triggerComplianceCheck();
