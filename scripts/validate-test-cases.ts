/**
 * Validate test cases - compare expected vs actual metrics
 */

import { db } from '../server/db';
import { workerCases } from '../shared/schema';
import { sql } from 'drizzle-orm';

interface ValidationResult {
  caseId: string;
  worker: string;
  employer: string;
  caseType: string;
  stage: string;
  daysOffWork: number;
  status: string;
  pass: boolean;
  issues: string[];
}

async function validateTestCases(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST CASE VALIDATION REPORT');
  console.log('  Comparing expected vs actual metrics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get all test cases using raw SQL to avoid drizzle issues
  const testCases = await db.execute(sql`
    SELECT * FROM worker_cases 
    WHERE id LIKE 'FD-471%'
    ORDER BY created_at DESC
  `);

  const rows = testCases.rows as any[];
  console.log(`Found ${rows.length} test cases\n`);

  const results: ValidationResult[] = [];
  let passCount = 0;
  let failCount = 0;

  // Stage expectations
  const stageExpectations: Record<string, { weeks: number; status: string }> = {
    intake: { weeks: 0, status: 'open' },
    assessment: { weeks: 1, status: 'open' },
    medical_review: { weeks: 2, status: 'pending' },
    rtw_planning: { weeks: 4, status: 'open' },
    early_rtw: { weeks: 6, status: 'open' },
    mid_recovery: { weeks: 12, status: 'open' },
    extended: { weeks: 18, status: 'open' },
    complex: { weeks: 26, status: 'pending' },
    closed_resolved: { weeks: 8, status: 'closed' },
  };

  for (const tc of rows) {
    // Parse case type and stage from summary
    const subject = tc.summary || '';
    const typeMatch = subject.match(/\[TEST-\d+\]\s+(\w+(?:\s+\w+)?)/i);
    const caseType = typeMatch ? typeMatch[1].toLowerCase().replace(' ', '_') : 'unknown';
    
    // Get stage from tags stored in description
    const stageMatch = subject.toLowerCase().match(/\b(intake|assessment|medical_review|rtw_planning|early_rtw|mid_recovery|extended|complex|closed_resolved)\b/);
    const stage = stageMatch ? stageMatch[1] : 'unknown';

    // Calculate days off work
    const injuryDate = tc.date_of_injury ? new Date(tc.date_of_injury) : new Date();
    const daysOffWork = Math.floor((Date.now() - injuryDate.getTime()) / (1000 * 60 * 60 * 24));

    const issues: string[] = [];
    const expected = stageExpectations[stage];

    if (expected) {
      const expectedDays = expected.weeks * 7;
      const daysDiff = Math.abs(daysOffWork - expectedDays);
      
      if (daysDiff > 14) {
        issues.push(`Days off: expected ~${expectedDays}, got ${daysOffWork} (diff: ${daysDiff})`);
      }

      const actualStatus = tc.case_status || 'open';
      if (actualStatus !== expected.status && !(expected.status === 'pending' && actualStatus === 'open')) {
        issues.push(`Status: expected "${expected.status}", got "${actualStatus}"`);
      }
    }

    const pass = issues.length === 0;
    if (pass) passCount++;
    else failCount++;

    results.push({
      caseId: tc.id,
      worker: tc.worker_name || 'Unknown',
      employer: tc.company || 'Unknown',
      caseType,
      stage,
      daysOffWork,
      status: tc.case_status || 'open',
      pass,
      issues,
    });
  }

  // Print results
  console.log('VALIDATION RESULTS:\n');
  
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`${icon} ${r.caseId} | ${r.worker.padEnd(20)} | ${r.caseType.padEnd(12)} | ${r.stage.padEnd(15)} | ${r.daysOffWork}d | ${r.status}`);
    
    for (const issue of r.issues) {
      console.log(`   ↳ ${issue}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passCount} passed, ${failCount} failed of ${results.length} test cases`);
  console.log(`  Pass rate: ${results.length > 0 ? ((passCount / results.length) * 100).toFixed(1) : 0}%`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group by case type
  console.log('BY CASE TYPE:');
  const byType: Record<string, { pass: number; fail: number }> = {};
  for (const r of results) {
    if (!byType[r.caseType]) byType[r.caseType] = { pass: 0, fail: 0 };
    if (r.pass) byType[r.caseType].pass++;
    else byType[r.caseType].fail++;
  }
  for (const [type, counts] of Object.entries(byType)) {
    const total = counts.pass + counts.fail;
    const rate = total > 0 ? ((counts.pass / total) * 100).toFixed(0) : '0';
    console.log(`  ${type.padEnd(15)} ${counts.pass}/${total} (${rate}%)`);
  }

  // Group by stage
  console.log('\nBY WORKFLOW STAGE:');
  const byStage: Record<string, { pass: number; fail: number }> = {};
  for (const r of results) {
    if (!byStage[r.stage]) byStage[r.stage] = { pass: 0, fail: 0 };
    if (r.pass) byStage[r.stage].pass++;
    else byStage[r.stage].fail++;
  }
  for (const [stage, counts] of Object.entries(byStage).sort((a, b) => {
    const order = ['intake', 'assessment', 'medical_review', 'rtw_planning', 'early_rtw', 'mid_recovery', 'extended', 'complex', 'closed_resolved', 'unknown'];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  })) {
    const total = counts.pass + counts.fail;
    const rate = total > 0 ? ((counts.pass / total) * 100).toFixed(0) : '0';
    console.log(`  ${stage.padEnd(15)} ${counts.pass}/${total} (${rate}%)`);
  }
}

validateTestCases().catch(console.error);
