/**
 * Fix Demo Data Script
 * 
 * Fixes data inconsistencies for demo-ready presentation:
 * 1. Cases with 100% time-based recovery but still "Off work" → create RTW plans
 * 2. Cases with bad "Next Step" data (e.g., Google Drive links)
 * 3. Ensures a good mix of RTW plan statuses for demo
 */

import 'dotenv/config';
import { db } from '../server/db';
import { workerCases } from '../shared/schema';
import { eq, like, sql } from 'drizzle-orm';
import type { RTWPlanStatus, CaseClinicalStatus } from '../shared/schema';

const EXPECTED_RECOVERY_WEEKS = 12;

function getWeeksElapsed(dateOfInjury: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - dateOfInjury.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

async function fixDemoData() {
  console.log('🔧 Starting demo data fix...\n');

  // Get all cases
  const allCases = await db.select().from(workerCases);
  console.log(`📊 Total cases: ${allCases.length}`);

  // 1. Fix cases with Google Drive links in nextStep
  const badNextStepCases = allCases.filter(c => 
    c.nextStep?.includes('drive.google.com') || 
    c.nextStep?.includes('http://') ||
    c.nextStep?.includes('https://')
  );
  
  console.log(`\n🔗 Cases with URL in nextStep: ${badNextStepCases.length}`);
  for (const c of badNextStepCases) {
    await db.update(workerCases)
      .set({ nextStep: 'Review case and determine appropriate action' })
      .where(eq(workerCases.id, c.id));
    console.log(`  ✅ Fixed nextStep for ${c.workerName}`);
  }

  // 2. Get cases that are "Off work" with old injuries (100% time-based progress)
  const offWorkCases = allCases.filter(c => c.workStatus === 'Off work');
  console.log(`\n🏥 Off work cases: ${offWorkCases.length}`);

  const oldOffWorkCases = offWorkCases.filter(c => {
    const weeksElapsed = getWeeksElapsed(new Date(c.dateOfInjury));
    return weeksElapsed >= EXPECTED_RECOVERY_WEEKS;
  });
  console.log(`⏰ Old injuries (12+ weeks) still off work: ${oldOffWorkCases.length}`);

  // 3. Distribute RTW statuses for demo variety
  const statusDistribution: RTWPlanStatus[] = [
    'in_progress', 'in_progress', 'in_progress',  // 3 in progress
    'working_well', 'working_well',               // 2 working well
    'completed', 'completed', 'completed',        // 3 completed
    'planned_not_started', 'planned_not_started', // 2 planned
    'failing',                                     // 1 failing (for demo)
  ];

  let statusIndex = 0;
  for (const c of oldOffWorkCases) {
    const clinicalStatus: CaseClinicalStatus = (c.clinicalStatusJson as CaseClinicalStatus) || {};
    const currentRtwStatus = clinicalStatus.rtwPlanStatus;
    
    // Only update if not_planned or undefined
    if (!currentRtwStatus || currentRtwStatus === 'not_planned') {
      const newStatus = statusDistribution[statusIndex % statusDistribution.length];
      statusIndex++;

      // Create a basic treatment plan if needed
      const updatedClinicalStatus: CaseClinicalStatus = {
        ...clinicalStatus,
        rtwPlanStatus: newStatus,
        treatmentPlan: clinicalStatus.treatmentPlan || {
          id: `plan-${c.id.slice(0, 8)}`,
          status: 'active',
          generatedAt: new Date().toISOString(),
          generatedBy: 'manual',
          confidence: 75,
          injuryType: 'musculoskeletal',
          interventions: [
            { type: 'physiotherapy', description: 'Weekly physiotherapy sessions', priority: 'recommended' },
            { type: 'workplace_modification', description: 'Modified duties assessment', priority: 'recommended' }
          ],
          expectedDurationWeeks: 8,
          milestones: [
            { weekNumber: 2, description: 'Initial assessment', expectedOutcome: 'Baseline established', completed: true },
            { weekNumber: 4, description: 'Progress review', expectedOutcome: '50% improvement', completed: newStatus !== 'planned_not_started' },
            { weekNumber: 8, description: 'Final review', expectedOutcome: 'Return to full duties', completed: newStatus === 'completed' }
          ],
          expectedOutcomes: ['Return to pre-injury duties', 'Full capacity'],
          factorsConsidered: ['Injury type', 'Worker age', 'Job demands'],
          disclaimerText: 'AI-generated treatment plan for review by clinical staff',
          rtwPlanStartDate: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000).toISOString(), // 6 weeks ago
        }
      };

      // Update work status for completed cases
      const newWorkStatus = newStatus === 'completed' ? 'At work' : c.workStatus;
      
      await db.update(workerCases)
        .set({ 
          clinicalStatusJson: updatedClinicalStatus,
          workStatus: newWorkStatus,
          nextStep: getNextStepForStatus(newStatus)
        })
        .where(eq(workerCases.id, c.id));
      
      console.log(`  ✅ ${c.workerName}: ${currentRtwStatus || 'not_planned'} → ${newStatus}${newStatus === 'completed' ? ' (now At work)' : ''}`);
    }
  }

  // 4. Summary
  const updatedCases = await db.select().from(workerCases);
  const rtwStats = {
    not_planned: 0,
    planned_not_started: 0,
    in_progress: 0,
    working_well: 0,
    failing: 0,
    on_hold: 0,
    completed: 0
  };

  for (const c of updatedCases) {
    const status = (c.clinicalStatusJson as CaseClinicalStatus)?.rtwPlanStatus || 'not_planned';
    if (status in rtwStats) {
      rtwStats[status as keyof typeof rtwStats]++;
    }
  }

  console.log('\n📊 Final RTW Status Distribution:');
  console.log(`  Not Planned: ${rtwStats.not_planned}`);
  console.log(`  Planned (Not Started): ${rtwStats.planned_not_started}`);
  console.log(`  In Progress: ${rtwStats.in_progress}`);
  console.log(`  Working Well: ${rtwStats.working_well}`);
  console.log(`  Failing: ${rtwStats.failing}`);
  console.log(`  On Hold: ${rtwStats.on_hold}`);
  console.log(`  Completed: ${rtwStats.completed}`);

  console.log('\n✅ Demo data fix complete!');
}

function getNextStepForStatus(status: RTWPlanStatus): string {
  switch (status) {
    case 'planned_not_started':
      return 'Schedule RTW plan kickoff meeting';
    case 'in_progress':
      return 'Review progress against milestones';
    case 'working_well':
      return 'Monitor and prepare for completion sign-off';
    case 'failing':
      return 'Urgent: Review barriers and adjust RTW plan';
    case 'completed':
      return 'Plan completed - monitor for sustained return';
    case 'on_hold':
      return 'Review hold reason and plan resumption';
    default:
      return 'Contact worker to assess current status';
  }
}

// Run the fix
fixDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
