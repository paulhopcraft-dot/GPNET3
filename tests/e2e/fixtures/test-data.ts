/**
 * Test Data Constants for E2E Tests
 *
 * Centralized test credentials, case IDs, and performance targets.
 * Import these in spec files and fixtures for consistent test data.
 */

// Base URL for all E2E tests - uses environment variable or localhost default
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5000';

// Admin credentials (full access)
export const ADMIN_CREDENTIALS = {
  email: 'admin@gpnet.local',
  password: 'ChangeMe123!',
} as const;

// Employer role credentials (limited access)
export const EMPLOYER_CREDENTIALS = {
  email: 'employer@test.com',
  password: 'password123',
} as const;

// Known valid case IDs from seed data
// These are cases that exist in the test database and can be used for navigation tests
export const TEST_CASE_IDS = [
  's25wf307549',  // Primary test case
] as const;

// Performance targets in milliseconds
// Used by @performance tagged tests to verify page load times
export const PERFORMANCE_TARGETS = {
  dashboard: 5000,     // Dashboard initial load
  caseList: 5000,      // Case list rendering
  caseDetail: 5000,    // Case detail page load
  login: 3000,         // Login flow completion
  navigation: 2000,    // Tab/route navigation
} as const;

// Test timeouts for different scenarios
export const TEST_TIMEOUTS = {
  short: 5000,         // Quick UI interactions
  medium: 15000,       // Page loads, authentication
  long: 30000,         // Complex operations
  extended: 60000,     // Slow network/heavy operations
} as const;

// URL patterns for route verification
export const URL_PATTERNS = {
  login: /\/login/,
  dashboard: /\/employer|\/cases/,
  caseDetail: /\/employer\/case\/[^/]+/,
  sessions: /\/sessions/,
  admin: /\/admin/,
} as const;

// Type exports for TypeScript consumers
export type Credentials = typeof ADMIN_CREDENTIALS | typeof EMPLOYER_CREDENTIALS;
export type CaseId = (typeof TEST_CASE_IDS)[number];
export type PerformanceTarget = keyof typeof PERFORMANCE_TARGETS;
