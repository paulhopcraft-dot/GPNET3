/**
 * Test Andres Nieto Case
 * Comprehensive test of a single worker case to verify:
 * - Date extraction is working correctly
 * - Data quality filter passes legitimate cases
 * - Case details are accurate
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Whc@0102030405@localhost:5432/gpnet'
});

async function testAndresCase() {
  await client.connect();
  console.log('🧪 Testing Andres Nieto Case\n');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Search for Andres Nieto case
    const result = await client.query(
      "SELECT * FROM worker_cases WHERE worker_name LIKE '%Nieto%' OR worker_name LIKE '%Andres%' ORDER BY created_at DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      console.log('❌ Andres Nieto case not found in database');
      console.log('\nSearching for similar names...');

      const similarResult = await client.query(
        "SELECT id, worker_name FROM worker_cases WHERE worker_name ILIKE '%andre%' LIMIT 10"
      );

      if (similarResult.rows.length > 0) {
        console.log('Found similar names:');
        similarResult.rows.forEach(r => {
          console.log(`  - ${r.worker_name} (${r.id})`);
        });
      }
      return;
    }

    const caseData = result.rows[0];

    console.log('CASE FOUND: ' + caseData.worker_name);
    console.log('═══════════════════════════════════════════════════════\n');

    // Test 1: Basic Information
    console.log('📋 BASIC INFORMATION');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Case ID:        ${caseData.id}`);
    console.log(`Worker Name:    ${caseData.worker_name}`);
    console.log(`Employer:       ${caseData.employer_company || 'N/A'}`);
    console.log(`Status:         ${caseData.case_status || 'N/A'}`);
    console.log(`Work Status:    ${caseData.work_status || 'N/A'}`);
    console.log(`Ticket IDs:     ${caseData.ticket_ids ? caseData.ticket_ids.join(', ') : 'none'}`);
    console.log(`Organization:   ${caseData.organization_id || 'N/A'}`);
    console.log();

    // Test 2: Date Parsing (Critical - this was the bug we fixed)
    console.log('📅 DATE PARSING TEST');
    console.log('─────────────────────────────────────────────────────');
    const injuryDate = new Date(caseData.date_of_injury);
    const createdDate = new Date(caseData.created_at);
    const updatedDate = new Date(caseData.updated_at);

    console.log(`Date of Injury: ${injuryDate.toLocaleDateString()} (${caseData.date_of_injury})`);
    console.log(`Created Date:   ${createdDate.toLocaleDateString()} (${caseData.created_at})`);
    console.log(`Updated Date:   ${updatedDate.toLocaleDateString()} (${caseData.updated_at})`);

    // Calculate how long ago the injury was
    const now = new Date();
    const daysSinceInjury = Math.floor((now - injuryDate) / (1000 * 60 * 60 * 24));
    const monthsSinceInjury = Math.floor(daysSinceInjury / 30);

    console.log(`Time since injury: ${daysSinceInjury} days (~${monthsSinceInjury} months)`);

    // Check if date looks correct (should be ~3 months ago based on original issue)
    const expectedMonths = 3;
    const dateLooksCorrect = monthsSinceInjury >= 2 && monthsSinceInjury <= 4;

    if (dateLooksCorrect) {
      console.log(`✅ DATE CORRECT: Injury date is ~${monthsSinceInjury} months ago (expected ~${expectedMonths})`);
    } else {
      console.log(`⚠️  DATE WARNING: Injury date is ${monthsSinceInjury} months ago (expected ~${expectedMonths})`);
    }

    // Check if date is suspiciously close to created date (fallback indicator)
    const hoursDiff = Math.abs(injuryDate - createdDate) / (1000 * 60 * 60);
    if (hoursDiff < 24) {
      console.log(`⚠️  SUSPICIOUS: Injury date within 24 hours of created date (${hoursDiff.toFixed(1)} hours)`);
      console.log(`   This suggests fallback to created_at was used`);
    } else {
      console.log(`✅ DATE SOURCE GOOD: Injury date differs from created date by ${Math.floor(hoursDiff / 24)} days`);
    }
    console.log();

    // Test 3: Data Quality Filter (would this case be filtered out?)
    console.log('🔍 DATA QUALITY FILTER TEST');
    console.log('─────────────────────────────────────────────────────');

    const workerName = caseData.worker_name || '';
    const normalizedName = workerName.trim().toLowerCase();

    // Check various filter conditions
    const checks = {
      hasName: workerName.trim() !== '',
      notNumeric: !/^\d+$/.test(workerName),
      noBrackets: !workerName.includes('[') && !workerName.includes(']'),
      notGeneric: !['test', 'testing', 'work period', 'adjustment'].includes(normalizedName),
      notAdmin: !['work period', 'adjustment', 'payroll'].some(term => normalizedName.includes(term)),
      hasCompanyOrDate: (caseData.employer_company && caseData.employer_company.trim() !== '') ||
                        !!caseData.date_of_injury
    };

    const allChecksPassed = Object.values(checks).every(v => v);

    console.log('Filter Checks:');
    console.log(`  Has name:              ${checks.hasName ? '✅' : '❌'}`);
    console.log(`  Not purely numeric:    ${checks.notNumeric ? '✅' : '❌'}`);
    console.log(`  No brackets:           ${checks.noBrackets ? '✅' : '❌'}`);
    console.log(`  Not generic name:      ${checks.notGeneric ? '✅' : '❌'}`);
    console.log(`  Not admin term:        ${checks.notAdmin ? '✅' : '❌'}`);
    console.log(`  Has company or date:   ${checks.hasCompanyOrDate ? '✅' : '❌'}`);
    console.log();

    if (allChecksPassed) {
      console.log('✅ FILTER RESULT: Case would PASS data quality filter (legitimate worker case)');
    } else {
      console.log('❌ FILTER RESULT: Case would be FILTERED OUT (not a legitimate worker case)');
    }
    console.log();

    // Test 4: Case Summary and Details
    console.log('📝 CASE DETAILS');
    console.log('─────────────────────────────────────────────────────');

    if (caseData.case_summary) {
      console.log('Summary:');
      console.log(caseData.case_summary.substring(0, 300) + (caseData.case_summary.length > 300 ? '...' : ''));
      console.log();
    } else {
      console.log('No case summary available\n');
    }

    if (caseData.injury_description) {
      console.log('Injury Description:');
      console.log(caseData.injury_description.substring(0, 200) + (caseData.injury_description.length > 200 ? '...' : ''));
      console.log();
    }

    // Test 5: Medical Certificates
    console.log('🏥 MEDICAL CERTIFICATES');
    console.log('─────────────────────────────────────────────────────');

    const certResult = await client.query(
      'SELECT * FROM medical_certificates WHERE case_id = $1 ORDER BY issue_date DESC',
      [caseData.id]
    );

    console.log(`Total certificates: ${certResult.rows.length}`);

    if (certResult.rows.length > 0) {
      console.log('\nMost recent certificate:');
      const cert = certResult.rows[0];
      console.log(`  Issue Date:    ${cert.issue_date ? new Date(cert.issue_date).toLocaleDateString() : 'N/A'}`);
      console.log(`  Valid Until:   ${cert.valid_until ? new Date(cert.valid_until).toLocaleDateString() : 'N/A'}`);
      console.log(`  Capacity:      ${cert.work_capacity || 'N/A'}`);
      console.log(`  Status:        ${cert.certificate_status || 'N/A'}`);
    }
    console.log();

    // Final Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');

    const testResults = {
      'Basic Info': !!caseData.worker_name && !!caseData.id,
      'Date Parsing': dateLooksCorrect,
      'Date Source': hoursDiff >= 24,
      'Data Quality': allChecksPassed,
      'Has Summary': !!caseData.case_summary,
      'Has Certificates': certResult.rows.length > 0
    };

    const passedTests = Object.values(testResults).filter(v => v).length;
    const totalTests = Object.keys(testResults).length;

    console.log(`Tests Passed: ${passedTests}/${totalTests}\n`);

    Object.entries(testResults).forEach(([test, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${test}`);
    });

    console.log();

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Andres Nieto case is in excellent condition.');
    } else {
      console.log(`⚠️  ${totalTests - passedTests} test(s) failed. Review results above.`);
    }

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testAndresCase();
