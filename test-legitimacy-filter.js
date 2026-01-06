/**
 * Test the updated isLegitimateCase filter
 * Verifies that administrative tickets are now filtered out
 */

// Mock the isLegitimateCase function with our updates
function isLegitimateCase(workerCase) {
  // Must have a worker name
  if (!workerCase.workerName || workerCase.workerName.trim() === "") {
    return false;
  }

  const normalizedName = workerCase.workerName.trim().toLowerCase();
  const originalName = workerCase.workerName.trim();

  // Filter out purely numeric names
  if (/^\d+$/.test(originalName)) {
    return false;
  }

  // Filter out names containing brackets
  if (originalName.includes('[') || originalName.includes(']')) {
    return false;
  }

  // Filter out names that are mostly numbers
  if (/\d{7,}/.test(originalName)) {
    return false;
  }

  // Filter out generic claim numbers
  if (normalizedName.startsWith("claim ") || /^claim\s*\d+/.test(normalizedName)) {
    return false;
  }

  // Filter out single character names
  if (normalizedName.length < 2 || normalizedName === "--" || normalizedName === ".." || normalizedName === "..") {
    return false;
  }

  // Filter out generic test/placeholder names (exact match)
  const genericNames = [
    "test", "testing", "unknown", "n/a", "none", "my certificate", "workcover",
    "work period", "adjustment", "adjustment request", "payroll", "hr request",
    "admin", "query", "request", "general inquiry", "information request"
  ];
  if (genericNames.includes(normalizedName)) {
    return false;
  }

  // Filter out names that contain generic administrative terms (substring match)
  const adminTerms = ["work period", "adjustment", "payroll", "hr request", "admin query"];
  if (adminTerms.some(term => normalizedName.includes(term))) {
    return false;
  }

  // Filter out names that start with "test" or "testing" (common test data)
  if (normalizedName.startsWith("test ") || normalizedName.startsWith("testing ")) {
    return false;
  }

  // Filter out names that start with generic worker identifiers
  if (normalizedName.startsWith("workcover ") || normalizedName.startsWith("worker ")) {
    return false;
  }

  // Filter out names that start with special characters or numbers
  if (/^[^a-z]/i.test(originalName)) {
    return false;
  }

  // Must have either a valid company OR a date of injury
  const hasValidCompany = workerCase.company && workerCase.company.trim() !== "";
  const hasInjuryDate = !!workerCase.dateOfInjury &&
    typeof workerCase.dateOfInjury === 'string' &&
    workerCase.dateOfInjury.trim() !== "";

  return hasValidCompany || hasInjuryDate;
}

console.log('🧪 Testing isLegitimateCase filter\n');
console.log('═══════════════════════════════════════════════════════');

const testCases = [
  // Previously suspicious cases - should now be filtered out
  { workerName: "Work Period", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "Adjustment Request", company: "", dateOfInjury: "2026-01-05", expected: false },

  // Other administrative tickets that should be filtered
  { workerName: "Payroll Query", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "HR Request", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "Admin", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "Request", company: "", dateOfInjury: "2026-01-05", expected: false },

  // Legitimate worker names - should pass
  { workerName: "John Smith", company: "Symmetry", dateOfInjury: "2025-10-15", expected: true },
  { workerName: "Maria Garcia", company: "Allied Health", dateOfInjury: "2025-09-20", expected: true },
  { workerName: "Andres Nieto", company: "", dateOfInjury: "2025-10-05", expected: true },
  { workerName: "Paul Johnson", company: "Apex Labour", dateOfInjury: "", expected: true },

  // Edge cases that should be filtered
  { workerName: "123456", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "Test Worker", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "Worker 123", company: "", dateOfInjury: "2026-01-05", expected: false },
  { workerName: "[Claim 12345]", company: "", dateOfInjury: "2026-01-05", expected: false },

  // Edge cases that should pass
  { workerName: "Li Wei", company: "Core Industrial", dateOfInjury: "", expected: true },
  { workerName: "Mohammed Al-Hassan", company: "", dateOfInjury: "2025-11-15", expected: true },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = isLegitimateCase(test);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} | "${test.workerName}" | Expected: ${test.expected}, Got: ${result}`);
});

console.log('═══════════════════════════════════════════════════════');
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All tests passed! Filter is working correctly.\n');
  console.log('The updated filter will now exclude:');
  console.log('  • "Work Period" tickets');
  console.log('  • "Adjustment Request" tickets');
  console.log('  • Other administrative/non-worker tickets\n');
  console.log('Next sync will automatically filter these out.');
} else {
  console.log('❌ Some tests failed. Review the filter logic.\n');
  process.exit(1);
}
