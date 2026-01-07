/**
 * Test the compliance engine on a specific case
 */

import "dotenv/config";
import { evaluateCase } from '../server/services/complianceEngine';
import { db } from '../server/db';
import { workerCases } from '@shared/schema';
import { ilike } from 'drizzle-orm';

async function testComplianceEngine() {
  const workerName = process.argv[2] || 'Jacob Gunn';

  console.log(`🔍 Testing compliance engine for: ${workerName}\n`);

  // Find the case
  const [workerCase] = await db.select()
    .from(workerCases)
    .where(ilike(workerCases.workerName, `%${workerName}%`))
    .limit(1);

  if (!workerCase) {
    console.error(`❌ Case not found for worker: ${workerName}`);
    process.exit(1);
  }

  console.log(`📋 Case Found: ${workerCase.workerName}`);
  console.log(`   Company: ${workerCase.companyName}`);
  console.log(`   Status: ${workerCase.currentWorkStatus}`);
  console.log(`   Claim ID: ${workerCase.claimNumber}\n`);

  console.log('⚙️  Evaluating compliance...\n');

  const report = await evaluateCase(workerCase.id);

  console.log('='.repeat(80));
  console.log(`📊 COMPLIANCE REPORT: ${report.workerName}`);
  console.log('='.repeat(80));
  console.log(`Overall Status: ${getStatusEmoji(report.overallStatus)} ${report.overallStatus.toUpperCase()}`);
  console.log(`Compliance Score: ${report.complianceScore}%`);
  console.log(`\nIssues:`);
  console.log(`  🔴 Critical: ${report.criticalIssues}`);
  console.log(`  🟠 High:     ${report.highIssues}`);
  console.log(`  🟡 Medium:   ${report.mediumIssues}`);
  console.log(`  🟢 Low:      ${report.lowIssues}`);
  console.log('='.repeat(80));

  console.log('\n📝 DETAILED CHECKS:\n');

  // Group by severity
  const criticalChecks = report.checks.filter(c => c.severity === 'critical');
  const highChecks = report.checks.filter(c => c.severity === 'high');
  const mediumChecks = report.checks.filter(c => c.severity === 'medium');
  const lowChecks = report.checks.filter(c => c.severity === 'low');

  const allChecks = [...criticalChecks, ...highChecks, ...mediumChecks, ...lowChecks];

  for (const check of allChecks) {
    const statusEmoji = getStatusEmoji(check.status);
    const severityEmoji = getSeverityEmoji(check.severity);

    console.log(`${statusEmoji} ${severityEmoji} ${check.ruleName} (${check.ruleCode})`);
    console.log(`   Status: ${check.status}`);
    console.log(`   Finding: ${check.finding}`);
    if (check.status !== 'compliant' && check.recommendation) {
      console.log(`   ➜ ${check.recommendation}`);
    }
    console.log(`   Sources: ${check.documentReferences.map(d => `${d.source}:${d.section}`).join(', ')}`);
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`Checked at: ${report.checkedAt.toLocaleString()}`);
  console.log('='.repeat(80));
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'compliant': return '✅';
    case 'warning': return '⚠️ ';
    case 'non_compliant': return '❌';
    default: return '⚪';
  }
}

function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

testComplianceEngine()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Error:', err);
    process.exit(1);
  });
