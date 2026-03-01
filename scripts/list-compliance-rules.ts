import "dotenv/config";
import { db } from '../server/db';
import { complianceRules } from '@shared/schema';

async function listComplianceRules() {
  console.log('📋 Compliance Rules in Database\n');

  const rules = await db.select()
    .from(complianceRules)
    .orderBy(complianceRules.severity, complianceRules.ruleCode);

  console.log('='.repeat(80));
  for (const rule of rules) {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[rule.severity] || '⚪';

    console.log(`\n${severityEmoji} ${rule.severity.toUpperCase()} | ${rule.ruleCode}`);
    console.log(`   ${rule.name}`);
    console.log(`   Type: ${rule.checkType}`);
    console.log(`   Documents: ${rule.documentReferences.map((d: any) => `${d.source}:${d.section}`).join(', ')}`);
    console.log(`   Action: ${rule.recommendedAction}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Total: ${rules.length} rules`);
  console.log('\nSeverity breakdown:');
  const severityCounts = rules.reduce((acc, rule) => {
    acc[rule.severity] = (acc[rule.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(severityCounts).forEach(([severity, count]) => {
    const emoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }[severity] || '⚪';
    console.log(`  ${emoji} ${severity}: ${count}`);
  });
}

listComplianceRules()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
