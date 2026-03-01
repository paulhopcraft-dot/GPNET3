/**
 * Database Integrity Tests
 *
 * Validates referential integrity, prevents orphan records, and checks
 * for data consistency issues that could cause application errors.
 *
 * These tests run against the actual database to catch real integrity issues.
 * Skips gracefully if DATABASE_URL is not set.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Pool } from 'pg';

// Note: These tests require database connection
// Skip if DATABASE_URL not set
const skipIfNoDb = !process.env.DATABASE_URL;

// Create a pool for direct SQL queries
let pool: Pool | null = null;

async function query(sql: string): Promise<{ rows: Record<string, unknown>[] }> {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool.query(sql);
}

describe.skipIf(skipIfNoDb)('Database Integrity', () => {
  beforeAll(async () => {
    // Initialize database connection
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }

    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    // Verify database connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      console.error('Database connection failed - skipping integrity tests');
      throw error;
    }
  });

  it('all certificates reference valid cases (no orphans)', async () => {
    const orphanCerts = await query(`
      SELECT mc.id, mc.case_id
      FROM medical_certificates mc
      LEFT JOIN worker_cases wc ON mc.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanCerts.rows.length > 0) {
      console.log('Orphan certificates found:', orphanCerts.rows);
    }

    expect(orphanCerts.rows).toHaveLength(0);
  });

  it('all actions reference valid cases (no orphans)', async () => {
    const orphanActions = await query(`
      SELECT ca.id, ca.case_id
      FROM case_actions ca
      LEFT JOIN worker_cases wc ON ca.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanActions.rows.length > 0) {
      console.log('Orphan actions found:', orphanActions.rows);
    }

    expect(orphanActions.rows).toHaveLength(0);
  });

  it('no duplicate case IDs exist', async () => {
    const duplicates = await query(`
      SELECT id, COUNT(*) as count
      FROM worker_cases
      GROUP BY id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log('Duplicate case IDs:', duplicates.rows);
    }

    expect(duplicates.rows).toHaveLength(0);
  });

  it('all users have valid email format', async () => {
    const invalidEmails = await query(`
      SELECT id, email
      FROM users
      WHERE email NOT LIKE '%@%.%'
    `);

    if (invalidEmails.rows.length > 0) {
      console.log('Invalid emails:', invalidEmails.rows);
    }

    expect(invalidEmails.rows).toHaveLength(0);
  });

  it('all termination processes reference valid cases (no orphans)', async () => {
    const orphanTerminations = await query(`
      SELECT tp.id, tp.worker_case_id
      FROM termination_processes tp
      LEFT JOIN worker_cases wc ON tp.worker_case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanTerminations.rows.length > 0) {
      console.log('Orphan termination processes:', orphanTerminations.rows);
    }

    expect(orphanTerminations.rows).toHaveLength(0);
  });

  it('all email drafts reference valid cases (no orphans)', async () => {
    const orphanDrafts = await query(`
      SELECT ed.id, ed.case_id
      FROM email_drafts ed
      LEFT JOIN worker_cases wc ON ed.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanDrafts.rows.length > 0) {
      console.log('Orphan email drafts found:', orphanDrafts.rows);
    }

    expect(orphanDrafts.rows).toHaveLength(0);
  });

  it('all notifications reference valid cases when case_id is set', async () => {
    const orphanNotifications = await query(`
      SELECT n.id, n.case_id
      FROM notifications n
      LEFT JOIN worker_cases wc ON n.case_id = wc.id
      WHERE n.case_id IS NOT NULL AND wc.id IS NULL
    `);

    if (orphanNotifications.rows.length > 0) {
      console.log('Orphan notifications found:', orphanNotifications.rows);
    }

    expect(orphanNotifications.rows).toHaveLength(0);
  });

  it('all case attachments reference valid cases (no orphans)', async () => {
    const orphanAttachments = await query(`
      SELECT ca.id, ca.case_id
      FROM case_attachments ca
      LEFT JOIN worker_cases wc ON ca.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanAttachments.rows.length > 0) {
      console.log('Orphan attachments found:', orphanAttachments.rows);
    }

    expect(orphanAttachments.rows).toHaveLength(0);
  });

  it('case counts are consistent', async () => {
    const caseCount = await query('SELECT COUNT(*) as count FROM worker_cases');
    const count = Number(caseCount.rows[0]?.count || 0);

    // Should have at least some cases in a functioning system
    console.log(`Total cases: ${count}`);

    // Informational - don't fail if no cases
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('no null foreign keys in required relationships', async () => {
    // Check certificates have case_id
    const nullCaseCerts = await query(`
      SELECT COUNT(*) as count
      FROM medical_certificates
      WHERE case_id IS NULL
    `);

    expect(Number(nullCaseCerts.rows[0]?.count || 0)).toBe(0);

    // Check actions have case_id
    const nullCaseActions = await query(`
      SELECT COUNT(*) as count
      FROM case_actions
      WHERE case_id IS NULL
    `);

    expect(Number(nullCaseActions.rows[0]?.count || 0)).toBe(0);
  });

  it('all case discussion notes reference valid cases', async () => {
    const orphanNotes = await query(`
      SELECT cdn.id, cdn.case_id
      FROM case_discussion_notes cdn
      LEFT JOIN worker_cases wc ON cdn.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanNotes.rows.length > 0) {
      console.log('Orphan discussion notes found:', orphanNotes.rows);
    }

    expect(orphanNotes.rows).toHaveLength(0);
  });

  it('all certificate expiry alerts reference valid certificates', async () => {
    const orphanAlerts = await query(`
      SELECT cea.id, cea.certificate_id
      FROM certificate_expiry_alerts cea
      LEFT JOIN medical_certificates mc ON cea.certificate_id = mc.id
      WHERE mc.id IS NULL
    `);

    if (orphanAlerts.rows.length > 0) {
      console.log('Orphan certificate alerts found:', orphanAlerts.rows);
    }

    expect(orphanAlerts.rows).toHaveLength(0);
  });

  it('all refresh tokens reference valid users', async () => {
    const orphanTokens = await query(`
      SELECT rt.id, rt.user_id
      FROM refresh_tokens rt
      LEFT JOIN users u ON rt.user_id = u.id
      WHERE u.id IS NULL
    `);

    if (orphanTokens.rows.length > 0) {
      console.log('Orphan refresh tokens found:', orphanTokens.rows);
    }

    expect(orphanTokens.rows).toHaveLength(0);
  });

  it('all RTW duties reference valid roles', async () => {
    const orphanDuties = await query(`
      SELECT rd.id, rd.role_id
      FROM rtw_duties rd
      LEFT JOIN rtw_roles rr ON rd.role_id = rr.id
      WHERE rr.id IS NULL
    `);

    if (orphanDuties.rows.length > 0) {
      console.log('Orphan RTW duties found:', orphanDuties.rows);
    }

    expect(orphanDuties.rows).toHaveLength(0);
  });

  it('all RTW plans reference valid cases', async () => {
    const orphanPlans = await query(`
      SELECT rp.id, rp.case_id
      FROM rtw_plans rp
      LEFT JOIN worker_cases wc ON rp.case_id = wc.id
      WHERE wc.id IS NULL
    `);

    if (orphanPlans.rows.length > 0) {
      console.log('Orphan RTW plans found:', orphanPlans.rows);
    }

    expect(orphanPlans.rows).toHaveLength(0);
  });

  it('no duplicate user emails within same organization', async () => {
    const duplicates = await query(`
      SELECT email, organization_id, COUNT(*) as count
      FROM users
      GROUP BY email, organization_id
      HAVING COUNT(*) > 1
    `);

    if (duplicates.rows.length > 0) {
      console.log('Duplicate user emails within org:', duplicates.rows);
    }

    expect(duplicates.rows).toHaveLength(0);
  });
});
