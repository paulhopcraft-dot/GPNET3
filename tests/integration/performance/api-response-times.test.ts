/**
 * API Response Time Performance Tests
 *
 * Tests that API endpoints respond within the 5 second target.
 * Logs actual response times for baseline establishment.
 *
 * Run: npm test -- tests/integration/performance
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api';
const PERFORMANCE_TARGET_MS = 5000;
const TEST_TIMEOUT_MS = 60000;

// Test credentials - should match seed data
const CREDENTIALS = {
  email: 'employer@test.com',
  password: 'password123'
};

describe('API Response Time Benchmarks', () => {
  let authCookie: string = '';

  beforeAll(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CREDENTIALS)
      });

      if (res.ok) {
        authCookie = res.headers.get('set-cookie') || '';
      } else {
        console.warn('Login failed - some tests may fail');
      }
    } catch (error) {
      console.warn('Could not authenticate - ensure server is running');
    }
  }, TEST_TIMEOUT_MS);

  const endpoints = [
    { path: '/employer/dashboard', target: PERFORMANCE_TARGET_MS, name: 'Employer Dashboard' },
    { path: '/gpnet2/cases', target: PERFORMANCE_TARGET_MS, name: 'Cases List' },
    { path: '/employer/workers', target: PERFORMANCE_TARGET_MS, name: 'Workers List' },
    { path: '/auth/me', target: 2000, name: 'Auth Check' },
  ];

  for (const { path, target, name } of endpoints) {
    it(`${name} responds within ${target}ms`, async () => {
      const start = performance.now();

      const res = await fetch(`${API_BASE}${path}`, {
        headers: { Cookie: authCookie }
      });

      const elapsed = performance.now() - start;

      console.log(`${name}: ${elapsed.toFixed(0)}ms (target: ${target}ms)`);

      // Log if slow but under target
      if (elapsed > target * 0.8) {
        console.warn(`  WARNING: ${name} approaching target (${(elapsed/target*100).toFixed(0)}% of limit)`);
      }

      expect(res.status).toBeLessThan(500); // Not server error
      expect(elapsed).toBeLessThan(target);
    }, TEST_TIMEOUT_MS);
  }

  it('identifies slow endpoints (> 8 seconds)', async () => {
    const slowEndpoints: { path: string; time: number }[] = [];

    const endpointsToCheck = [
      '/employer/dashboard',
      '/gpnet2/cases',
      '/employer/workers',
      '/notifications',
      '/actions',
    ];

    for (const path of endpointsToCheck) {
      try {
        const start = performance.now();
        await fetch(`${API_BASE}${path}`, {
          headers: { Cookie: authCookie }
        });
        const elapsed = performance.now() - start;

        if (elapsed > 8000) {
          slowEndpoints.push({ path, time: elapsed });
        }
      } catch {
        // Skip failed requests
      }
    }

    console.log('Slow endpoints (>8s):', slowEndpoints);

    // This is informational - don't fail the test
    // Just log for baseline establishment
  }, TEST_TIMEOUT_MS);

  it('case detail endpoint responds within target', async () => {
    // First get a case ID
    const casesRes = await fetch(`${API_BASE}/gpnet2/cases`, {
      headers: { Cookie: authCookie }
    });

    if (!casesRes.ok) {
      console.warn('Could not fetch cases - skipping case detail test');
      return;
    }

    const cases = await casesRes.json();
    if (!cases?.cases?.length) {
      console.warn('No cases found - skipping case detail test');
      return;
    }

    const caseId = cases.cases[0].id;

    const start = performance.now();
    const detailRes = await fetch(`${API_BASE}/cases/${caseId}`, {
      headers: { Cookie: authCookie }
    });
    const elapsed = performance.now() - start;

    console.log(`Case Detail (${caseId}): ${elapsed.toFixed(0)}ms`);

    expect(detailRes.status).toBeLessThan(500);
    expect(elapsed).toBeLessThan(PERFORMANCE_TARGET_MS);
  }, TEST_TIMEOUT_MS);
});
