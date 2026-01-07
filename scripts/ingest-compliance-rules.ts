/**
 * Ingest compliance rules into compliance_rules table
 *
 * This script defines initial compliance rules based on:
 * - WIRC Act 2013
 * - WorkSafe Claims Manual
 */

import "dotenv/config";
import { db } from '../server/db';
import { complianceRules } from '@shared/schema';
import { eq } from 'drizzle-orm';

const INITIAL_RULES = [
  {
    ruleCode: 'CERT_CURRENT',
    name: 'Certificate Must Be Current',
    description: 'Worker off work must have a current certificate of capacity. Certificate must be from a registered medical practitioner and specify worker\'s capacity for work.',
    documentReferences: [
      { source: 'wirc_act', section: 's38' },
      { source: 'worksafe_manual', section: '2.4' }
    ],
    checkType: 'certificate',
    severity: 'critical',
    evaluationLogic: {
      condition: 'certificate.endDate >= today AND worker.workStatus === "Off work"',
      parameters: {
        checkField: 'certificateEndDate',
        compareAgainst: 'currentDate',
        operator: 'greaterThanOrEqual'
      }
    },
    recommendedAction: 'Chase certificate immediately. Payments may be suspended if certificate expires.'
  },
  {
    ruleCode: 'RTW_PLAN_10WK',
    name: 'RTW Plan Within 10 Weeks',
    description: 'For serious injuries, a return to work plan must be developed within 10 weeks of the worker\'s incapacity. The plan must identify suitable duties and outline the graduated return to work process.',
    documentReferences: [
      { source: 'wirc_act', section: 's41' },
      { source: 'worksafe_manual', section: '5.3' }
    ],
    checkType: 'rtw_plan',
    severity: 'high',
    evaluationLogic: {
      condition: 'rtwPlan.created <= injuryDate + 70 days',
      parameters: {
        checkField: 'rtwPlanCreatedDate',
        compareAgainst: 'injuryDate',
        operator: 'lessThanOrEqualDaysOffset',
        daysOffset: 70
      }
    },
    recommendedAction: 'Develop RTW plan with employer and worker. Both parties must participate in good faith.'
  },
  {
    ruleCode: 'FILE_REVIEW_8WK',
    name: 'Case Review Every 8 Weeks',
    description: 'WIRC Regulation 224 requires agents to review case files at intervals not exceeding 8 weeks. The review must assess the worker\'s current work capacity and determine ongoing entitlement to weekly payments and services.',
    documentReferences: [
      { source: 'wirc_act', section: 'reg224' },
      { source: 'worksafe_manual', section: '5.1' }
    ],
    checkType: 'file_review',
    severity: 'medium',
    evaluationLogic: {
      condition: 'lastReviewDate <= today - 56 days',
      parameters: {
        checkField: 'lastReviewDate',
        compareAgainst: 'currentDate',
        operator: 'lessThanOrEqualDaysAgo',
        daysAgo: 56
      }
    },
    recommendedAction: 'Schedule case review within 1 week to maintain compliance with 8-week requirement.'
  },
  {
    ruleCode: 'PAYMENT_STEPDOWN',
    name: 'Weekly Payment Step-Down After 13 Weeks',
    description: 'After the first 13 weeks of incapacity, weekly payments are reduced if the worker has not returned to work with the pre-injury employer. This step-down provision encourages return to work while maintaining income support.',
    documentReferences: [
      { source: 'wirc_act', section: 's37' },
      { source: 'worksafe_manual', section: '3.4' }
    ],
    checkType: 'payment',
    severity: 'low',
    evaluationLogic: {
      condition: 'weeksOffWork >= 13 AND notReturnedToWork',
      parameters: {
        checkField: 'weeksOffWork',
        compareAgainst: 13,
        operator: 'greaterThanOrEqual',
        additionalCheck: 'notReturnedToPreInjuryEmployer'
      }
    },
    recommendedAction: 'Notify worker of payment reduction. Review RTW opportunities with pre-injury employer.'
  },
  {
    ruleCode: 'CENTRELINK_CLEARANCE',
    name: 'Centrelink Clearance Required',
    description: 'Employers must obtain Centrelink clearance before processing payments if the worker is receiving social security benefits. This prevents double-dipping and ensures compliance with federal regulations.',
    documentReferences: [
      { source: 'worksafe_manual', section: '3.5' }
    ],
    checkType: 'payment',
    severity: 'high',
    evaluationLogic: {
      condition: 'payment.pending AND noCentrelinkClearance',
      parameters: {
        checkField: 'centrelinkClearanceStatus',
        compareAgainst: 'required',
        operator: 'equals'
      }
    },
    recommendedAction: 'Obtain Centrelink clearance notice before processing any payments. Clearance must be dated and on file.'
  },
  {
    ruleCode: 'SUITABLE_DUTIES',
    name: 'Employer Must Provide Suitable Duties',
    description: 'An employer must provide a worker with suitable employment where it is reasonable to do so. Suitable employment means work that is safe and appropriate having regard to the nature of the worker\'s incapacity, their skills, experience and pre-injury duties.',
    documentReferences: [
      { source: 'wirc_act', section: 's99' },
      { source: 'worksafe_manual', section: '5.2' }
    ],
    checkType: 'rtw_plan',
    severity: 'high',
    evaluationLogic: {
      condition: 'worker.hasCapacity AND noSuitableDutiesIdentified',
      parameters: {
        checkField: 'suitableDutiesStatus',
        compareAgainst: 'identified',
        operator: 'notEquals'
      }
    },
    recommendedAction: 'Work with employer to identify suitable duties. Follow hierarchy: pre-injury duties → alternative duties with pre-injury employer → alternative employment.'
  },
  {
    ruleCode: 'RTW_OBLIGATIONS',
    name: 'Return to Work Obligations',
    description: 'Sections 155-165 outline comprehensive obligations for employers, workers, and agents in the return to work process. This includes requirements for case management, suitable duties, graduated return, and cooperation between parties.',
    documentReferences: [
      { source: 'wirc_act', section: 's155-165' },
      { source: 'worksafe_manual', section: '5' }
    ],
    checkType: 'rtw_plan',
    severity: 'medium',
    evaluationLogic: {
      condition: 'worker.hasCapacity AND noRTWProgress',
      parameters: {
        checkField: 'rtwProgress',
        compareAgainst: 'none',
        operator: 'equals'
      }
    },
    recommendedAction: 'Review RTW obligations with all parties. Ensure cooperation and good faith participation in RTW process.'
  }
];

async function ingestComplianceRules() {
  console.log('🔄 Ingesting compliance rules into database...\n');

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const rule of INITIAL_RULES) {
    try {
      console.log(`  Processing: ${rule.ruleCode} - ${rule.name}`);

      // Check if already exists
      const [existing] = await db.select()
        .from(complianceRules)
        .where(eq(complianceRules.ruleCode, rule.ruleCode))
        .limit(1);

      if (existing) {
        console.log(`    ⏭️  Already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Insert into database
      await db.insert(complianceRules).values({
        ruleCode: rule.ruleCode,
        name: rule.name,
        description: rule.description,
        documentReferences: rule.documentReferences,
        checkType: rule.checkType,
        severity: rule.severity,
        evaluationLogic: rule.evaluationLogic,
        recommendedAction: rule.recommendedAction,
        isActive: true,
      });

      console.log(`    ✅ Ingested successfully`);
      successCount++;

    } catch (err) {
      console.error(`    ❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Compliance Rules Ingestion Complete');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors:  ${errorCount}`);
  console.log(`📝 Total:   ${INITIAL_RULES.length}`);
  console.log('='.repeat(60));
}

// Run the ingestion
ingestComplianceRules()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });
