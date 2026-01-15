// Test Certificate Date Validation Fix
import dayjs from 'dayjs';

// Simulate the validation logic from the fix
function testCertificateValidation() {
  console.log('🧪 TESTING CERTIFICATE DATE VALIDATION FIX');
  console.log('============================================\n');

  const now = dayjs();
  const maxFutureDate = now.add(30, 'day');

  console.log(`Today: ${now.format('YYYY-MM-DD')}`);
  console.log(`Max future date allowed: ${maxFutureDate.format('YYYY-MM-DD')}\n`);

  // Test cases that should trigger validation
  const testCases = [
    {
      name: 'Andres Nieto case (July 2026)',
      startDate: '2026-07-01',
      endDate: '2026-07-01',
      shouldFail: true
    },
    {
      name: 'Valid current certificate',
      startDate: '2026-01-15',
      endDate: '2026-02-15',
      shouldFail: false
    },
    {
      name: 'Near future (30 days)',
      startDate: now.add(25, 'day').format('YYYY-MM-DD'),
      endDate: now.add(35, 'day').format('YYYY-MM-DD'),
      shouldFail: false
    },
    {
      name: 'Far future (60 days)',
      startDate: now.add(60, 'day').format('YYYY-MM-DD'),
      endDate: now.add(90, 'day').format('YYYY-MM-DD'),
      shouldFail: true
    }
  ];

  testCases.forEach((testCase, i) => {
    const start = dayjs(testCase.startDate);
    const end = dayjs(testCase.endDate);

    // Apply the same validation logic as the fix
    const isFutureDate = start.isAfter(maxFutureDate) || end.isAfter(maxFutureDate);
    const result = isFutureDate ? '🚨 BLOCKED' : '✅ ALLOWED';
    const expected = testCase.shouldFail ? '🚨 BLOCKED' : '✅ ALLOWED';
    const status = result === expected ? '✓' : '✗ FAILED';

    console.log(`${i + 1}. ${testCase.name}`);
    console.log(`   Start: ${testCase.startDate}`);
    console.log(`   End: ${testCase.endDate}`);
    console.log(`   Result: ${result}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Test: ${status}\n`);
  });

  console.log('🔧 Fix Summary:');
  console.log('- Certificates with dates > 30 days in future are rejected');
  console.log('- System falls back to ticket creation date');
  console.log('- Warning is logged for investigation');
  console.log('- Existing certificates need manual correction');
}

testCertificateValidation();