/**
 * Test Report Generator
 * Runs all tests in wave order and generates summary report
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestResult {
  wave: string;
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface ReportData {
  timestamp: string;
  results: TestResult[];
  summary: {
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    totalDuration: number;
  };
}

async function runTests(): Promise<ReportData> {
  const results: TestResult[] = [];
  const timestamp = new Date().toISOString();

  console.log('\n================================');
  console.log('SYSTEM-WIDE TEST SUITE');
  console.log('================================\n');

  // Wave 1: Smoke Tests
  console.log('Wave 1: Running Smoke Tests...');
  const smokeResult = await runTestWave('@smoke', 'Smoke Tests');
  results.push(smokeResult);

  if (smokeResult.failed > 0) {
    console.log('WARNING: Smoke tests failed. System may have issues.');
  }

  // Wave 2: Critical Path Tests
  console.log('\nWave 2: Running Critical Path Tests...');
  const criticalResult = await runTestWave('@critical', 'Critical Path');
  results.push(criticalResult);

  // Wave 3: Regression Tests
  console.log('\nWave 3: Running Regression Tests...');
  const regressionResult = await runTestWave('@regression', 'Regression');
  results.push(regressionResult);

  // Wave 4: Performance Tests
  console.log('\nWave 4: Running Performance Tests...');
  const perfResult = await runTestWave('@performance', 'Performance');
  results.push(perfResult);

  // Wave 5: Integration Tests (Vitest)
  console.log('\nWave 5: Running Integration Tests...');
  const integrationResult = await runVitestSuite('Integration');
  results.push(integrationResult);

  // Calculate summary
  const summary = {
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };

  return { timestamp, results, summary };
}

async function runTestWave(tag: string, name: string): Promise<TestResult> {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const output = execSync(
      `npx playwright test --grep "${tag}" --reporter=json`,
      { encoding: 'utf-8', timeout: 300000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const jsonResult = JSON.parse(output);
    passed = jsonResult.stats?.passed || 0;
    failed = jsonResult.stats?.failed || 0;
    skipped = jsonResult.stats?.skipped || 0;

  } catch (error: any) {
    // Parse error output
    if (error.stdout) {
      try {
        const jsonResult = JSON.parse(error.stdout);
        passed = jsonResult.stats?.passed || 0;
        failed = jsonResult.stats?.failed || 0;
        skipped = jsonResult.stats?.skipped || 0;

        if (jsonResult.suites) {
          for (const suite of jsonResult.suites) {
            for (const spec of suite.specs || []) {
              if (spec.ok === false) {
                errors.push(`${suite.title}: ${spec.title}`);
              }
            }
          }
        }
      } catch {
        errors.push(error.message || 'Unknown error');
        failed = 1;
      }
    } else {
      errors.push(error.message || 'Test execution failed');
      failed = 1;
    }
  }

  const duration = Date.now() - startTime;

  console.log(`  ${name}: ${passed} passed, ${failed} failed, ${skipped} skipped (${(duration/1000).toFixed(1)}s)`);

  return { wave: tag, name, passed, failed, skipped, duration, errors };
}

async function runVitestSuite(name: string): Promise<TestResult> {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    execSync('npm test -- --run', { encoding: 'utf-8', timeout: 120000, stdio: 'pipe' });
    passed = 1; // Vitest run passed

  } catch (error: any) {
    if (error.status === 0) {
      passed = 1;
    } else {
      failed = 1;
      errors.push(error.message || 'Vitest failed');
    }
  }

  const duration = Date.now() - startTime;
  console.log(`  ${name}: ${passed ? 'PASSED' : 'FAILED'} (${(duration/1000).toFixed(1)}s)`);

  return { wave: 'integration', name, passed, failed, skipped, duration, errors };
}

function generateReport(data: ReportData): string {
  const { timestamp, results, summary } = data;

  let report = `# System-Wide Test Report

**Generated:** ${timestamp}
**Duration:** ${(summary.totalDuration / 1000).toFixed(1)} seconds

## Summary

| Metric | Count |
|--------|-------|
| Passed | ${summary.totalPassed} |
| Failed | ${summary.totalFailed} |
| Skipped | ${summary.totalSkipped} |
| Total | ${summary.totalPassed + summary.totalFailed + summary.totalSkipped} |

**Status:** ${summary.totalFailed === 0 ? 'ALL TESTS PASSED' : 'TESTS FAILED'}

## Results by Wave

`;

  for (const result of results) {
    const status = result.failed === 0 ? 'PASS' : 'FAIL';
    report += `### ${result.name} [${status}]\n\n`;
    report += `- Passed: ${result.passed}\n`;
    report += `- Failed: ${result.failed}\n`;
    report += `- Skipped: ${result.skipped}\n`;
    report += `- Duration: ${(result.duration / 1000).toFixed(1)}s\n`;

    if (result.errors.length > 0) {
      report += `\n**Errors:**\n`;
      for (const error of result.errors) {
        report += `- ${error}\n`;
      }
    }

    report += '\n';
  }

  report += `---
*Report generated by test-report-generator.ts*
`;

  return report;
}

// Main execution
runTests().then(data => {
  const report = generateReport(data);

  // Write report to file
  const reportPath = '.planning/phases/11-system-wide-testing/11-TEST-REPORT.md';
  fs.writeFileSync(reportPath, report);

  console.log('\n================================');
  console.log('TEST SUITE COMPLETE');
  console.log('================================');
  console.log(`\nPassed: ${data.summary.totalPassed}`);
  console.log(`Failed: ${data.summary.totalFailed}`);
  console.log(`Skipped: ${data.summary.totalSkipped}`);
  console.log(`Duration: ${(data.summary.totalDuration / 1000).toFixed(1)}s`);
  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error code if tests failed
  if (data.summary.totalFailed > 0) {
    process.exit(1);
  }
});
