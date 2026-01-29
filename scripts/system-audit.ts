/**
 * Comprehensive System Audit
 * Tests Preventli from both Case Manager and Software Engineer perspectives
 */

import 'dotenv/config';
import { db } from '../server/db';
import { workerCases, users, medicalCertificates, auditEvents } from '../shared/schema';
import { count, eq, isNull, sql, and, or, like, desc } from 'drizzle-orm';
import type { WorkerCase, CaseClinicalStatus, RTWPlanStatus } from '../shared/schema';

interface AuditResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

const results: AuditResult[] = [];

function log(result: AuditResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${result.category}] ${result.check}: ${result.details}`);
  results.push(result);
}

async function auditDatabase() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  DATABASE INTEGRITY AUDIT');
  console.log('═══════════════════════════════════════════\n');

  // Count records
  const [casesCount] = await db.select({ count: count() }).from(workerCases);
  const [usersCount] = await db.select({ count: count() }).from(users);
  const [certsCount] = await db.select({ count: count() }).from(medicalCertificates);
  const [auditCount] = await db.select({ count: count() }).from(auditEvents);

  console.log(`📊 Record Counts:`);
  console.log(`   Cases: ${casesCount.count}`);
  console.log(`   Users: ${usersCount.count}`);
  console.log(`   Certificates: ${certsCount.count}`);
  console.log(`   Audit Events: ${auditCount.count}\n`);

  log({
    category: 'Database',
    check: 'Has sufficient demo data',
    status: Number(casesCount.count) >= 50 ? 'PASS' : 'WARN',
    details: `${casesCount.count} cases in database`
  });

  log({
    category: 'Database',
    check: 'Has users configured',
    status: Number(usersCount.count) > 0 ? 'PASS' : 'FAIL',
    details: `${usersCount.count} users`,
    severity: 'critical'
  });

  log({
    category: 'Database',
    check: 'Has certificates',
    status: Number(certsCount.count) > 0 ? 'PASS' : 'WARN',
    details: `${certsCount.count} medical certificates`
  });
}

async function auditDataQuality() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  DATA QUALITY AUDIT');
  console.log('═══════════════════════════════════════════\n');

  const allCases = await db.select().from(workerCases);

  // Check for missing required fields
  const missingWorkerName = allCases.filter(c => !c.workerName || c.workerName.trim() === '');
  log({
    category: 'Data Quality',
    check: 'All cases have worker names',
    status: missingWorkerName.length === 0 ? 'PASS' : 'FAIL',
    details: missingWorkerName.length === 0 ? 'All cases have names' : `${missingWorkerName.length} cases missing worker name`,
    severity: 'high'
  });

  // Check for future injury dates (impossible)
  const futureInjuries = allCases.filter(c => new Date(c.dateOfInjury) > new Date());
  log({
    category: 'Data Quality',
    check: 'No future injury dates',
    status: futureInjuries.length === 0 ? 'PASS' : 'FAIL',
    details: futureInjuries.length === 0 ? 'All injury dates are valid' : `${futureInjuries.length} cases have future injury dates`,
    severity: 'high'
  });

  // Check for very old injury dates (suspicious)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const veryOldInjuries = allCases.filter(c => new Date(c.dateOfInjury) < twoYearsAgo);
  log({
    category: 'Data Quality',
    check: 'Injury dates are reasonable',
    status: veryOldInjuries.length < 10 ? 'PASS' : 'WARN',
    details: `${veryOldInjuries.length} cases older than 2 years (may need review)`
  });

  // Check for bad next steps (URLs, empty, etc)
  const badNextSteps = allCases.filter(c => 
    !c.nextStep || 
    c.nextStep.includes('http://') || 
    c.nextStep.includes('https://') ||
    c.nextStep.trim() === ''
  );
  log({
    category: 'Data Quality',
    check: 'Next steps are actionable',
    status: badNextSteps.length === 0 ? 'PASS' : 'WARN',
    details: badNextSteps.length === 0 ? 'All next steps are valid' : `${badNextSteps.length} cases have problematic next steps`
  });

  // Check work status consistency
  const atWorkButHighRisk = allCases.filter(c => 
    c.workStatus === 'At work' && c.riskLevel === 'High'
  );
  log({
    category: 'Data Quality',
    check: 'Work status consistent with risk',
    status: atWorkButHighRisk.length < 5 ? 'PASS' : 'WARN',
    details: `${atWorkButHighRisk.length} cases are at work but high risk (may need review)`
  });
}

async function auditBusinessLogic() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  BUSINESS LOGIC AUDIT');
  console.log('═══════════════════════════════════════════\n');

  const allCases = await db.select().from(workerCases);

  // RTW Plan Status distribution
  const rtwStats: Record<string, number> = {
    not_planned: 0,
    planned_not_started: 0,
    in_progress: 0,
    working_well: 0,
    failing: 0,
    on_hold: 0,
    completed: 0,
    undefined: 0
  };

  for (const c of allCases) {
    const status = (c.clinicalStatusJson as CaseClinicalStatus)?.rtwPlanStatus || 'undefined';
    rtwStats[status] = (rtwStats[status] || 0) + 1;
  }

  console.log('📊 RTW Plan Status Distribution:');
  Object.entries(rtwStats).forEach(([status, count]) => {
    if (count > 0) console.log(`   ${status}: ${count}`);
  });

  const hasRtwPlans = rtwStats.in_progress + rtwStats.working_well + rtwStats.completed + rtwStats.planned_not_started > 0;
  log({
    category: 'Business Logic',
    check: 'System has RTW plans',
    status: hasRtwPlans ? 'PASS' : 'FAIL',
    details: hasRtwPlans ? 'RTW planning is active' : 'No RTW plans exist - feature appears unused',
    severity: 'high'
  });

  // Check for completed RTW but still off work
  const completedButOffWork = allCases.filter(c => {
    const clinical = c.clinicalStatusJson as CaseClinicalStatus;
    return clinical?.rtwPlanStatus === 'completed' && c.workStatus === 'Off work';
  });
  log({
    category: 'Business Logic',
    check: 'Completed RTW cases are at work',
    status: completedButOffWork.length === 0 ? 'PASS' : 'FAIL',
    details: completedButOffWork.length === 0 ? 'All completed RTW cases are at work' : `${completedButOffWork.length} cases completed RTW but still off work`,
    severity: 'medium'
  });

  // Check off-work cases have proper tracking
  const offWorkCases = allCases.filter(c => c.workStatus === 'Off work');
  const offWorkWithoutTracking = offWorkCases.filter(c => {
    const clinical = c.clinicalStatusJson as CaseClinicalStatus;
    return !clinical?.rtwPlanStatus || clinical.rtwPlanStatus === 'not_planned';
  });
  
  const trackingPercentage = offWorkCases.length > 0 
    ? Math.round(((offWorkCases.length - offWorkWithoutTracking.length) / offWorkCases.length) * 100)
    : 100;
  
  log({
    category: 'Business Logic',
    check: 'Off-work cases have RTW tracking',
    status: trackingPercentage >= 30 ? 'PASS' : 'WARN',
    details: `${trackingPercentage}% of off-work cases have RTW plans (${offWorkCases.length - offWorkWithoutTracking.length}/${offWorkCases.length})`
  });
}

async function auditCaseManagerWorkflow() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  CASE MANAGER WORKFLOW AUDIT');
  console.log('═══════════════════════════════════════════\n');

  const allCases = await db.select().from(workerCases);
  const certs = await db.select().from(medicalCertificates);

  // Check certificates are linked to cases
  const casesWithCerts = new Set(certs.map(c => c.caseId));
  const casesNeedingCerts = allCases.filter(c => 
    c.workStatus === 'Off work' && !casesWithCerts.has(c.id)
  );
  
  log({
    category: 'Workflow',
    check: 'Off-work cases have certificates',
    status: casesNeedingCerts.length < allCases.length * 0.3 ? 'PASS' : 'WARN',
    details: `${casesWithCerts.size} cases have certificates, ${casesNeedingCerts.length} off-work cases may need certificates`
  });

  // Check for audit history
  const audits = await db.select().from(auditEvents);
  
  log({
    category: 'Workflow',
    check: 'System has audit trail',
    status: audits.length > 0 ? 'PASS' : 'WARN',
    details: `${audits.length} audit events recorded`
  });

  // Check risk levels distribution
  const riskDist = {
    High: allCases.filter(c => c.riskLevel === 'High').length,
    Medium: allCases.filter(c => c.riskLevel === 'Medium').length,
    Low: allCases.filter(c => c.riskLevel === 'Low').length
  };
  
  console.log('\n📊 Risk Level Distribution:');
  console.log(`   High: ${riskDist.High} (${Math.round(riskDist.High/allCases.length*100)}%)`);
  console.log(`   Medium: ${riskDist.Medium} (${Math.round(riskDist.Medium/allCases.length*100)}%)`);
  console.log(`   Low: ${riskDist.Low} (${Math.round(riskDist.Low/allCases.length*100)}%)`);

  log({
    category: 'Workflow',
    check: 'Risk levels are realistic',
    status: riskDist.High < allCases.length * 0.5 ? 'PASS' : 'WARN',
    details: riskDist.High < allCases.length * 0.5 ? 'Risk distribution is realistic' : 'Too many high-risk cases may indicate data issue'
  });
}

async function auditUserExperience() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  USER EXPERIENCE AUDIT');
  console.log('═══════════════════════════════════════════\n');

  const allCases = await db.select().from(workerCases);

  // Check for duplicate worker names (confusing)
  const nameCount: Record<string, number> = {};
  allCases.forEach(c => {
    nameCount[c.workerName] = (nameCount[c.workerName] || 0) + 1;
  });
  const duplicates = Object.entries(nameCount).filter(([_, count]) => count > 1);
  
  log({
    category: 'UX',
    check: 'Worker names are unique',
    status: duplicates.length < 5 ? 'PASS' : 'WARN',
    details: duplicates.length === 0 ? 'All worker names unique' : `${duplicates.length} duplicate names may cause confusion`
  });

  // Check summary quality
  const shortSummaries = allCases.filter(c => !c.summary || c.summary.length < 20);
  log({
    category: 'UX',
    check: 'Case summaries are informative',
    status: shortSummaries.length < allCases.length * 0.1 ? 'PASS' : 'WARN',
    details: shortSummaries.length === 0 ? 'All summaries are detailed' : `${shortSummaries.length} cases have minimal summaries`
  });

  // Check companies for demo
  const companies = new Set(allCases.map(c => c.company));
  log({
    category: 'UX',
    check: 'Multiple companies for demo',
    status: companies.size >= 3 ? 'PASS' : 'WARN',
    details: `${companies.size} different companies in system`
  });
}

async function generateSummary() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const criticalFails = results.filter(r => r.status === 'FAIL' && r.severity === 'critical').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (criticalFails > 0) {
    console.log(`\n🚨 CRITICAL FAILURES (${criticalFails}):`);
    results.filter(r => r.status === 'FAIL' && r.severity === 'critical').forEach(r => {
      console.log(`   - ${r.check}: ${r.details}`);
    });
  }

  if (failed > 0) {
    console.log(`\n❌ ALL FAILURES:`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - [${r.category}] ${r.check}: ${r.details}`);
    });
  }

  if (warnings > 0) {
    console.log(`\n⚠️  WARNINGS:`);
    results.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`   - [${r.category}] ${r.check}: ${r.details}`);
    });
  }

  const overallScore = Math.round((passed / results.length) * 100);
  console.log(`\n📊 OVERALL SCORE: ${overallScore}%`);
  
  if (overallScore >= 80 && criticalFails === 0) {
    console.log('🎉 System is DEMO READY!');
  } else if (overallScore >= 60) {
    console.log('⚠️  System needs some attention before demo');
  } else {
    console.log('🚨 System has significant issues to address');
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   PREVENTLI SYSTEM AUDIT                  ║');
  console.log('║   Testing as Case Manager + Engineer      ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    await auditDatabase();
    await auditDataQuality();
    await auditBusinessLogic();
    await auditCaseManagerWorkflow();
    await auditUserExperience();
    await generateSummary();
  } catch (error) {
    console.error('❌ Audit failed with error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
