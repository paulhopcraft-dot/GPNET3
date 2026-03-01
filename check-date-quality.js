/**
 * Date Quality Analysis Script
 * Checks worker cases for date accuracy and identifies cases needing review
 */

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Whc@0102030405@localhost:5432/gpnet'
});

async function analyzeDateQuality() {
  await client.connect();
  console.log('🔍 Analyzing date quality across all worker cases...\n');

  try {
    // Get all cases with date information
    const result = await client.query(`
      SELECT
        id,
        worker_name,
        date_of_injury,
        created_at,
        updated_at,
        ticket_ids,
        organization_id
      FROM worker_cases
      ORDER BY created_at DESC
    `);

    const cases = result.rows;
    console.log(`📊 Total cases: ${cases.length}\n`);

    // Categorize by date patterns
    const stats = {
      totalCases: cases.length,
      withInjuryDate: 0,
      recentDates: 0, // Within last 7 days (likely fallback to created_at)
      oldDates: 0,    // Older than 30 days (likely real dates)
      veryOldDates: 0, // Older than 90 days
      suspiciousDates: [], // Cases where injury date = created date (possible fallback)
      missingDates: []
    };

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    for (const c of cases) {
      if (!c.date_of_injury) {
        stats.missingDates.push({
          id: c.id,
          worker: c.worker_name,
          ticketIds: c.ticket_ids
        });
        continue;
      }

      stats.withInjuryDate++;
      const injuryDate = new Date(c.date_of_injury);
      const createdDate = new Date(c.created_at);

      // Check if injury date matches created date (suspicious - likely fallback)
      const dateDiff = Math.abs(injuryDate.getTime() - createdDate.getTime());
      const hoursDiff = dateDiff / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        stats.suspiciousDates.push({
          id: c.id,
          worker: c.worker_name,
          injuryDate: c.date_of_injury,
          createdDate: c.created_at,
          ticketIds: c.ticket_ids,
          hoursDiff: hoursDiff.toFixed(1)
        });
      }

      // Categorize by age
      if (injuryDate > sevenDaysAgo) {
        stats.recentDates++;
      } else if (injuryDate > thirtyDaysAgo) {
        stats.oldDates++;
      } else if (injuryDate > ninetyDaysAgo) {
        stats.veryOldDates++;
      } else {
        stats.veryOldDates++;
      }
    }

    // Print statistics
    console.log('═══════════════════════════════════════════════════════');
    console.log('DATE QUALITY STATISTICS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total cases:                ${stats.totalCases}`);
    console.log(`Cases with injury date:     ${stats.withInjuryDate} (${((stats.withInjuryDate/stats.totalCases)*100).toFixed(1)}%)`);
    console.log(`Cases missing injury date:  ${stats.missingDates.length} (${((stats.missingDates.length/stats.totalCases)*100).toFixed(1)}%)`);
    console.log('');
    console.log('DATE AGE DISTRIBUTION:');
    console.log(`  Recent (< 7 days):        ${stats.recentDates} (${((stats.recentDates/stats.withInjuryDate)*100).toFixed(1)}%)`);
    console.log(`  Medium (7-30 days):       ${stats.oldDates} (${((stats.oldDates/stats.withInjuryDate)*100).toFixed(1)}%)`);
    console.log(`  Old (30-90 days):         ${stats.veryOldDates} (${((stats.veryOldDates/stats.withInjuryDate)*100).toFixed(1)}%)`);
    console.log('');
    console.log('⚠️  SUSPICIOUS DATES (injury date = created date):');
    console.log(`  Count: ${stats.suspiciousDates.length} (${((stats.suspiciousDates.length/stats.totalCases)*100).toFixed(1)}%)`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Show suspicious cases
    if (stats.suspiciousDates.length > 0) {
      console.log('🚨 CASES NEEDING REVIEW (injury date matches created date):\n');
      const displayLimit = 20;
      const displayCases = stats.suspiciousDates.slice(0, displayLimit);

      for (const c of displayCases) {
        console.log(`  Worker: ${c.worker}`);
        console.log(`  Case ID: ${c.id}`);
        console.log(`  Injury Date: ${c.injuryDate}`);
        console.log(`  Created Date: ${c.createdDate}`);
        console.log(`  Difference: ${c.hoursDiff} hours`);
        console.log(`  Tickets: ${c.ticketIds ? c.ticketIds.join(', ') : 'none'}`);
        console.log('  ---');
      }

      if (stats.suspiciousDates.length > displayLimit) {
        console.log(`  ... and ${stats.suspiciousDates.length - displayLimit} more cases\n`);
      }
    }

    // Show missing dates
    if (stats.missingDates.length > 0) {
      console.log('\n❌ CASES WITH MISSING INJURY DATES:\n');
      const displayLimit = 10;
      const displayCases = stats.missingDates.slice(0, displayLimit);

      for (const c of displayCases) {
        console.log(`  Worker: ${c.worker}`);
        console.log(`  Case ID: ${c.id}`);
        console.log(`  Tickets: ${c.ticketIds ? c.ticketIds.join(', ') : 'none'}`);
        console.log('  ---');
      }

      if (stats.missingDates.length > displayLimit) {
        console.log(`  ... and ${stats.missingDates.length - displayLimit} more cases\n`);
      }
    }

    // Recommendations
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════');

    const suspiciousRate = (stats.suspiciousDates.length / stats.totalCases) * 100;
    const missingRate = (stats.missingDates.length / stats.totalCases) * 100;

    if (suspiciousRate > 50) {
      console.log('🔴 HIGH PRIORITY: >50% of cases have suspicious dates');
      console.log('   Action: Review Freshdesk custom fields and text extraction logic');
    } else if (suspiciousRate > 20) {
      console.log('🟡 MEDIUM PRIORITY: >20% of cases have suspicious dates');
      console.log('   Action: Spot-check high-value cases and improve date extraction');
    } else {
      console.log('🟢 LOW PRIORITY: <20% of cases have suspicious dates');
      console.log('   Action: Current date extraction is working reasonably well');
    }

    if (missingRate > 5) {
      console.log('\n🟡 Some cases have missing injury dates');
      console.log('   Action: Check if these are test cases or need manual entry');
    }

    console.log('\n📝 Next Steps:');
    console.log('   1. Check Freshdesk tickets for suspicious cases');
    console.log('   2. Update cf_injury_date custom field in Freshdesk where possible');
    console.log('   3. Improve text extraction patterns if needed');
    console.log('   4. Re-run sync to update dates');
    console.log('═══════════════════════════════════════════════════════\n');

    // Export detailed report
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      suspiciousCases: stats.suspiciousDates,
      missingDateCases: stats.missingDates
    };

    const fs = await import('fs');
    fs.writeFileSync(
      'date-quality-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('✅ Detailed report saved to: date-quality-report.json\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

analyzeDateQuality();
