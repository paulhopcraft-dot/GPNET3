/**
 * Compliance Rules Engine
 *
 * Evaluates worker cases against compliance rules from:
 * - WIRC Act 2013
 * - WorkSafe Claims Manual
 *
 * Stores results in case_compliance_checks table
 */

import { db } from '../db';
import { complianceRules, caseComplianceChecks, workerCases, medicalCertificates } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import type { WorkerCaseDB, ComplianceRuleDB, CaseComplianceCheckDB } from '@shared/schema';

export interface ComplianceCheckResult {
  ruleCode: string;
  ruleName: string;
  status: 'compliant' | 'warning' | 'non_compliant';
  severity: string;
  finding: string;
  recommendation: string;
  documentReferences: Array<{ source: string; section: string }>;
}

export interface CaseComplianceReport {
  caseId: string;
  workerName: string;
  companyName: string;
  overallStatus: 'compliant' | 'warning' | 'non_compliant';
  complianceScore: number; // Percentage (0-100)
  checks: ComplianceCheckResult[];
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  checkedAt: Date;
}

/**
 * Evaluate a single case against all active compliance rules
 */
export async function evaluateCase(caseId: string): Promise<CaseComplianceReport> {
  // Get the case
  const [workerCase] = await db.select()
    .from(workerCases)
    .where(eq(workerCases.id, caseId))
    .limit(1);

  if (!workerCase) {
    throw new Error(`Case ${caseId} not found`);
  }

  // Get all active rules
  const rules = await db.select()
    .from(complianceRules)
    .where(eq(complianceRules.isActive, true));

  const checks: ComplianceCheckResult[] = [];
  let compliantCount = 0;
  let warningCount = 0;
  let nonCompliantCount = 0;

  let criticalIssues = 0;
  let highIssues = 0;
  let mediumIssues = 0;
  let lowIssues = 0;

  const checkedAt = new Date();

  // Evaluate each rule
  for (const rule of rules) {
    const result = await evaluateRule(workerCase, rule);
    checks.push(result);

    // Count by status
    if (result.status === 'compliant') {
      compliantCount++;
    } else if (result.status === 'warning') {
      warningCount++;
    } else {
      nonCompliantCount++;
    }

    // Count by severity if non-compliant
    if (result.status === 'non_compliant') {
      if (rule.severity === 'critical') criticalIssues++;
      else if (rule.severity === 'high') highIssues++;
      else if (rule.severity === 'medium') mediumIssues++;
      else if (rule.severity === 'low') lowIssues++;
    }

    // Store check result in database
    await db.insert(caseComplianceChecks).values({
      caseId: workerCase.id,
      ruleId: rule.id,
      status: result.status,
      checkedAt,
      finding: result.finding,
      recommendation: result.recommendation,
      actionCreated: false,
    });
  }

  // Calculate overall status and score
  const totalRules = rules.length;
  const complianceScore = totalRules > 0 ? Math.round((compliantCount / totalRules) * 100) : 100;

  let overallStatus: 'compliant' | 'warning' | 'non_compliant' = 'compliant';
  if (criticalIssues > 0 || highIssues > 0) {
    overallStatus = 'non_compliant';
  } else if (warningCount > 0 || mediumIssues > 0) {
    overallStatus = 'warning';
  }

  return {
    caseId: workerCase.id,
    workerName: workerCase.workerName,
    companyName: workerCase.company,
    overallStatus,
    complianceScore,
    checks,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    checkedAt,
  };
}

/**
 * Evaluate a single rule against a case
 */
async function evaluateRule(workerCase: WorkerCaseDB, rule: ComplianceRuleDB): Promise<ComplianceCheckResult> {
  const baseResult: ComplianceCheckResult = {
    ruleCode: rule.ruleCode,
    ruleName: rule.name,
    status: 'compliant',
    severity: rule.severity,
    finding: '',
    recommendation: '',
    documentReferences: rule.documentReferences as Array<{ source: string; section: string }>,
  };

  // Evaluate based on rule type
  switch (rule.ruleCode) {
    case 'CERT_CURRENT':
      return await evaluateCertificateCurrent(workerCase, rule, baseResult);

    case 'RTW_PLAN_10WK':
      return await evaluateRTWPlan10Weeks(workerCase, rule, baseResult);

    case 'FILE_REVIEW_8WK':
      return await evaluateFileReview8Weeks(workerCase, rule, baseResult);

    case 'PAYMENT_STEPDOWN':
      return await evaluatePaymentStepDown(workerCase, rule, baseResult);

    case 'CENTRELINK_CLEARANCE':
      return await evaluateCentrelinkClearance(workerCase, rule, baseResult);

    case 'SUITABLE_DUTIES':
      return await evaluateSuitableDuties(workerCase, rule, baseResult);

    case 'RTW_OBLIGATIONS':
      return await evaluateRTWObligations(workerCase, rule, baseResult);

    default:
      baseResult.status = 'warning';
      baseResult.finding = 'Rule evaluation not implemented';
      baseResult.recommendation = 'Manual review required';
      return baseResult;
  }
}

/**
 * CERT_CURRENT: Certificate must be current for workers off work
 */
async function evaluateCertificateCurrent(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // Only check if worker is off work
  // Check currentStatus field for "Off work" status
  const isOffWork = workerCase.currentStatus && workerCase.currentStatus.toLowerCase().includes('off work');

  if (!isOffWork) {
    result.status = 'compliant';
    result.finding = 'Worker is not off work, certificate check not applicable';
    return result;
  }

  // Get most recent certificate
  const [latestCert] = await db.select()
    .from(medicalCertificates)
    .where(eq(medicalCertificates.caseId, workerCase.id))
    .orderBy(desc(medicalCertificates.endDate))
    .limit(1);

  if (!latestCert) {
    result.status = 'non_compliant';
    result.finding = 'No medical certificate on file. Worker is off work but has no certificate.';
    result.recommendation = rule.recommendedAction;
    return result;
  }

  const today = new Date();
  const certEndDate = new Date(latestCert.endDate);
  const daysSinceExpiry = Math.floor((today.getTime() - certEndDate.getTime()) / (1000 * 60 * 60 * 24));

  if (certEndDate < today) {
    result.status = 'non_compliant';
    result.finding = `Certificate expired ${daysSinceExpiry} days ago (expired ${certEndDate.toLocaleDateString()}). Worker is off work and requires current certificate.`;
    result.recommendation = rule.recommendedAction;
  } else if (daysSinceExpiry >= -7) {
    result.status = 'warning';
    result.finding = `Certificate expires soon (${certEndDate.toLocaleDateString()}). Request renewal to avoid gap.`;
    result.recommendation = 'Request new certificate from treating practitioner';
  } else {
    result.status = 'compliant';
    result.finding = `Certificate is current (valid until ${certEndDate.toLocaleDateString()})`;
  }

  return result;
}

/**
 * RTW_PLAN_10WK: RTW plan must be developed within 10 weeks for serious injuries
 */
async function evaluateRTWPlan10Weeks(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This requires RTW plan data which we don't have in the schema yet
  // For now, return a placeholder
  result.status = 'warning';
  result.finding = 'RTW plan tracking not yet implemented';
  result.recommendation = 'Manual review required to verify RTW plan status';
  return result;
}

/**
 * FILE_REVIEW_8WK: Case must be reviewed every 8 weeks
 */
async function evaluateFileReview8Weeks(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This requires review tracking which we don't have yet
  // For now, use updatedAt as a proxy
  const lastUpdate = workerCase.updatedAt ? new Date(workerCase.updatedAt) : new Date();
  const today = new Date();
  const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceUpdate > 56) {
    result.status = 'non_compliant';
    result.finding = `Case has not been reviewed in ${daysSinceUpdate} days (last update: ${lastUpdate.toLocaleDateString()}). Exceeds 8-week requirement.`;
    result.recommendation = rule.recommendedAction;
  } else if (daysSinceUpdate > 49) {
    result.status = 'warning';
    result.finding = `Case review due soon (last update: ${lastUpdate.toLocaleDateString()}, ${daysSinceUpdate} days ago)`;
    result.recommendation = 'Schedule review within 1 week';
  } else {
    result.status = 'compliant';
    result.finding = `Case reviewed recently (${daysSinceUpdate} days ago)`;
  }

  return result;
}

/**
 * PAYMENT_STEPDOWN: Inform worker of payment reduction after 13 weeks
 */
async function evaluatePaymentStepDown(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This is informational - low severity
  result.status = 'compliant';
  result.finding = 'Payment step-down tracking requires manual review';
  return result;
}

/**
 * CENTRELINK_CLEARANCE: Must have Centrelink clearance before payments
 */
async function evaluateCentrelinkClearance(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This requires Centrelink clearance tracking
  result.status = 'warning';
  result.finding = 'Centrelink clearance status unknown - manual verification required';
  result.recommendation = 'Verify Centrelink clearance is on file before processing payments';
  return result;
}

/**
 * SUITABLE_DUTIES: Employer must provide suitable duties
 */
async function evaluateSuitableDuties(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This requires suitable duties tracking
  result.status = 'warning';
  result.finding = 'Suitable duties status requires manual review';
  result.recommendation = 'Verify suitable duties have been identified and offered';
  return result;
}

/**
 * RTW_OBLIGATIONS: Parties must cooperate in RTW process
 */
async function evaluateRTWObligations(
  workerCase: WorkerCaseDB,
  rule: ComplianceRuleDB,
  result: ComplianceCheckResult
): Promise<ComplianceCheckResult> {
  // This requires RTW cooperation tracking
  result.status = 'compliant';
  result.finding = 'RTW cooperation status requires manual assessment';
  return result;
}

/**
 * Get latest compliance report for a case
 */
export async function getLatestComplianceReport(caseId: string): Promise<ComplianceCheckResult[]> {
  const checks = await db.select({
    ruleCode: complianceRules.ruleCode,
    ruleName: complianceRules.name,
    status: caseComplianceChecks.status,
    severity: complianceRules.severity,
    finding: caseComplianceChecks.finding,
    recommendation: caseComplianceChecks.recommendation,
    documentReferences: complianceRules.documentReferences,
  })
    .from(caseComplianceChecks)
    .innerJoin(complianceRules, eq(caseComplianceChecks.ruleId, complianceRules.id))
    .where(eq(caseComplianceChecks.caseId, caseId))
    .orderBy(desc(caseComplianceChecks.checkedAt));

  // Group by rule and take the latest check for each
  const latestChecks = new Map<string, any>();
  for (const check of checks) {
    if (!latestChecks.has(check.ruleCode)) {
      latestChecks.set(check.ruleCode, check);
    }
  }

  return Array.from(latestChecks.values()).map(check => ({
    ruleCode: check.ruleCode,
    ruleName: check.ruleName,
    status: check.status,
    severity: check.severity,
    finding: check.finding || '',
    recommendation: check.recommendation || '',
    documentReferences: check.documentReferences as Array<{ source: string; section: string }>,
  }));
}
