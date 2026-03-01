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
import type { WorkerCaseDB, ComplianceRuleDB, CaseComplianceCheckDB, CaseActionType } from '@shared/schema';
import { storage } from '../storage';

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

    // Create action for non-compliant rules
    let actionId: string | null = null;
    let actionCreated = false;

    if (result.status === 'non_compliant' && result.recommendation) {
      actionId = await createComplianceAction(
        workerCase.id,
        rule.ruleCode,
        result.finding || 'Compliance issue detected',
        result.recommendation
      );
      actionCreated = actionId !== null;
    }

    // Store check result in database
    await db.insert(caseComplianceChecks).values({
      caseId: workerCase.id,
      ruleId: rule.id,
      status: result.status,
      checkedAt,
      finding: result.finding,
      recommendation: result.recommendation,
      actionId,
      actionCreated,
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
  // Calculate weeks since injury
  const injuryDate = new Date(workerCase.dateOfInjury);
  const today = new Date();
  const weeksSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

  // Get RTW plan status from case data
  const rtwStatus = workerCase.clinicalStatusJson?.rtwPlanStatus;

  // If injury is less than 10 weeks old, not applicable yet
  if (weeksSinceInjury < 10) {
    result.status = 'compliant';
    result.finding = `Injury is ${weeksSinceInjury} weeks old. RTW plan requirement applies after 10 weeks.`;
    return result;
  }

  // Evaluate based on RTW plan status
  switch (rtwStatus) {
    case 'not_planned':
      result.status = 'non_compliant';
      result.finding = `RTW plan not initiated after ${weeksSinceInjury} weeks. Plan required within 10 weeks of serious injury.`;
      result.recommendation = rule.recommendedAction;
      break;

    case 'planned_not_started':
      result.status = 'warning';
      result.finding = `RTW plan exists but not started after ${weeksSinceInjury} weeks. Requires activation.`;
      result.recommendation = 'Activate RTW plan and begin implementation';
      break;

    case 'in_progress':
    case 'working_well':
    case 'completed':
      result.status = 'compliant';
      result.finding = `RTW plan is active and progressing (${weeksSinceInjury} weeks post-injury, status: ${rtwStatus})`;
      break;

    case 'failing':
      result.status = 'non_compliant';
      result.finding = `RTW plan is failing after ${weeksSinceInjury} weeks. Requires intervention and plan revision.`;
      result.recommendation = 'Review and revise RTW plan with stakeholders';
      break;

    default:
      // No RTW plan status recorded
      result.status = 'warning';
      result.finding = `RTW plan status unknown after ${weeksSinceInjury} weeks. Manual assessment required.`;
      result.recommendation = 'Assess RTW plan status and update case records';
  }

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
  const workStatus = workerCase.workStatus;
  const injuryDate = new Date(workerCase.dateOfInjury);
  const today = new Date();
  const weeksSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

  // If worker is at work, step-down is not applicable
  if (workStatus === 'At work' || workStatus === 'Working alternate role') {
    result.status = 'compliant';
    result.finding = 'Worker has returned to work. Payment step-down not applicable.';
    return result;
  }

  // Check if worker is off work and past 13 weeks
  if (workStatus === 'Off work') {
    if (weeksSinceInjury < 13) {
      result.status = 'compliant';
      result.finding = `Worker is ${weeksSinceInjury} weeks post-injury. Payment step-down applies after 13 weeks.`;
    } else if (weeksSinceInjury >= 13 && weeksSinceInjury <= 15) {
      // Grace period around 13 weeks
      result.status = 'warning';
      result.finding = `Worker is ${weeksSinceInjury} weeks post-injury. Payment step-down should be reviewed and implemented if applicable.`;
      result.recommendation = 'Review payment entitlements and implement step-down provisions per WorkSafe guidelines';
    } else {
      // Well past 13 weeks
      result.status = 'warning';
      result.finding = `Worker is ${weeksSinceInjury} weeks post-injury (>13 weeks). Verify payment step-down has been implemented.`;
      result.recommendation = 'Confirm payment step-down provisions are correctly applied per WorkSafe requirements';
    }
  } else {
    // Work status unclear
    result.status = 'compliant';
    result.finding = 'Payment step-down compliance requires assessment based on current work status and payment arrangements.';
  }

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
  const workStatus = workerCase.workStatus;
  const clinicalStatus = workerCase.clinicalStatusJson;

  // If worker has returned to work, Centrelink clearance may not be required
  if (workStatus === 'At work' || workStatus === 'Working alternate role') {
    result.status = 'compliant';
    result.finding = 'Worker has returned to work. Centrelink clearance requirements may not apply.';
    return result;
  }

  // Check if Centrelink clearance is documented in clinical status
  if (clinicalStatus && 'centrelinkClearance' in clinicalStatus) {
    if (clinicalStatus.centrelinkClearance === true) {
      result.status = 'compliant';
      result.finding = 'Centrelink clearance documented and confirmed.';
    } else if (clinicalStatus.centrelinkClearance === false) {
      result.status = 'non_compliant';
      result.finding = 'Centrelink clearance explicitly noted as not obtained.';
      result.recommendation = rule.recommendedAction;
    } else {
      result.status = 'warning';
      result.finding = 'Centrelink clearance status unclear from documentation.';
      result.recommendation = 'Verify and document Centrelink clearance status';
    }
    return result;
  }

  // Check if worker is likely receiving payments (off work)
  if (workStatus === 'Off work') {
    const injuryDate = new Date(workerCase.dateOfInjury);
    const today = new Date();
    const weeksSinceInjury = Math.floor((today.getTime() - injuryDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

    // For longer-term claims, Centrelink clearance becomes more important
    if (weeksSinceInjury > 4) {
      result.status = 'warning';
      result.finding = `Worker off work for ${weeksSinceInjury} weeks. Centrelink clearance status should be verified and documented.`;
      result.recommendation = 'Obtain and document Centrelink clearance before processing ongoing payments';
    } else {
      result.status = 'compliant';
      result.finding = `Early claim (${weeksSinceInjury} weeks). Centrelink clearance may not yet be required.`;
    }
  } else {
    // Work status unclear, default to requiring verification
    result.status = 'warning';
    result.finding = 'Centrelink clearance status unknown. Manual verification required for payment compliance.';
    result.recommendation = 'Verify and document Centrelink clearance status in case records';
  }

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
  const rtwStatus = workerCase.clinicalStatusJson?.rtwPlanStatus;
  const functionalCapacity = workerCase.clinicalStatusJson?.functionalCapacity;
  const workStatus = workerCase.workStatus;

  // If worker has returned to work, suitable duties requirement is satisfied
  if (workStatus === 'At work' || workStatus === 'Working alternate role') {
    result.status = 'compliant';
    result.finding = 'Worker has returned to work. Suitable duties requirement satisfied.';
    return result;
  }

  // Check if RTW plan indicates suitable duties work
  if (rtwStatus === 'working_well' || rtwStatus === 'completed') {
    result.status = 'compliant';
    result.finding = 'RTW plan shows suitable duties are working well or completed.';
    return result;
  }

  // If worker is off work and has functional capacity, suitable duties should be assessed
  if (workStatus === 'Off work' && functionalCapacity) {
    // Check if RTW plan is in progress (indicating suitable duties consideration)
    if (rtwStatus === 'in_progress' || rtwStatus === 'planned_not_started') {
      result.status = 'warning';
      result.finding = 'Worker has functional capacity but RTW plan is still developing. Monitor suitable duties identification.';
      result.recommendation = 'Ensure suitable duties are identified and offered as part of RTW plan';
    } else if (rtwStatus === 'failing') {
      result.status = 'non_compliant';
      result.finding = 'Worker has functional capacity but RTW plan is failing. Suitable duties may not have been properly identified or offered.';
      result.recommendation = rule.recommendedAction;
    } else {
      result.status = 'warning';
      result.finding = 'Worker has functional capacity but suitable duties status unclear.';
      result.recommendation = 'Assess suitable duties availability with employer';
    }
  } else if (workStatus === 'Off work' && !functionalCapacity) {
    // Worker has no functional capacity documented - suitable duties not applicable
    result.status = 'compliant';
    result.finding = 'Worker off work with no functional capacity documented. Suitable duties requirement not applicable.';
  } else {
    // Default case - requires manual review
    result.status = 'warning';
    result.finding = 'Suitable duties compliance requires manual assessment based on worker capacity and employer capabilities.';
    result.recommendation = 'Review worker capacity and employer suitable duties options';
  }

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
  const rtwStatus = workerCase.clinicalStatusJson?.rtwPlanStatus;
  const workStatus = workerCase.workStatus;
  const lastUpdate = new Date(workerCase.updatedAt || workerCase.createdAt || Date.now());
  const today = new Date();
  const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

  // If worker has returned to work successfully, obligations are met
  if (workStatus === 'At work' || rtwStatus === 'completed' || rtwStatus === 'working_well') {
    result.status = 'compliant';
    result.finding = 'Worker has successfully returned to work or RTW plan is working well. Obligations are being met.';
    return result;
  }

  // Check for signs of cooperation/engagement
  if (rtwStatus === 'in_progress') {
    if (daysSinceUpdate <= 14) {
      result.status = 'compliant';
      result.finding = 'RTW plan in progress with recent case activity. Parties appear to be cooperating.';
    } else {
      result.status = 'warning';
      result.finding = `RTW plan in progress but no case updates for ${daysSinceUpdate} days. May indicate reduced engagement.`;
      result.recommendation = 'Check with all parties on RTW plan progress and engagement';
    }
    return result;
  }

  // Check for signs of non-cooperation
  if (rtwStatus === 'failing') {
    result.status = 'non_compliant';
    result.finding = 'RTW plan is failing which may indicate lack of cooperation from one or more parties.';
    result.recommendation = rule.recommendedAction;
    return result;
  }

  // Assess based on case activity and status
  if (workStatus === 'Off work') {
    if (rtwStatus === 'not_planned' && daysSinceUpdate > 30) {
      result.status = 'warning';
      result.finding = `Worker off work with no RTW plan and no case activity for ${daysSinceUpdate} days. Cooperation may be lacking.`;
      result.recommendation = 'Engage all parties to assess RTW cooperation and obligations';
    } else if (rtwStatus === 'planned_not_started' && daysSinceUpdate > 21) {
      result.status = 'warning';
      result.finding = 'RTW plan exists but not started with limited recent activity. Monitor party cooperation.';
      result.recommendation = 'Follow up on RTW plan activation and party engagement';
    } else if (daysSinceUpdate <= 21) {
      result.status = 'compliant';
      result.finding = 'Recent case activity indicates ongoing engagement and cooperation with RTW obligations.';
    } else {
      result.status = 'warning';
      result.finding = `Limited case activity (${daysSinceUpdate} days since update). RTW obligation compliance unclear.`;
      result.recommendation = 'Assess current level of worker and employer cooperation with RTW process';
    }
  } else {
    // Worker status unclear, default to compliant with monitoring
    result.status = 'compliant';
    result.finding = 'RTW obligations compliance requires ongoing monitoring of party cooperation.';
  }

  return result;
}

/**
 * Create a compliance-related action for non-compliant rules
 */
async function createComplianceAction(
  caseId: string,
  ruleCode: string,
  finding: string,
  recommendation: string
): Promise<string | null> {
  try {
    // Map rule codes to appropriate action types
    let actionType: CaseActionType;
    let actionNotes: string;
    let dueDate: Date | undefined;

    switch (ruleCode) {
      case 'RTW_PLAN_10WK':
        actionType = 'review_case';
        actionNotes = `COMPLIANCE: RTW Plan Development Required - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;

      case 'SUITABLE_DUTIES':
        actionType = 'follow_up';
        actionNotes = `COMPLIANCE: Suitable Duties Assessment - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
        break;

      case 'RTW_OBLIGATIONS':
        actionType = 'follow_up';
        actionNotes = `COMPLIANCE: RTW Obligations Review - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
        break;

      case 'PAYMENT_STEPDOWN':
        actionType = 'review_case';
        actionNotes = `COMPLIANCE: Payment Step-Down Review - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;

      case 'CENTRELINK_CLEARANCE':
        actionType = 'follow_up';
        actionNotes = `COMPLIANCE: Centrelink Clearance Verification - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
        break;

      default:
        // For other compliance rules, use a generic follow-up action
        actionType = 'follow_up';
        actionNotes = `COMPLIANCE: ${ruleCode} - ${finding}. Action: ${recommendation}`;
        dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    }

    // Create or update the action using the storage layer
    const action = await storage.upsertAction(caseId, actionType, dueDate, actionNotes);

    return action.id;
  } catch (error) {
    console.error(`[ComplianceEngine] Failed to create action for rule ${ruleCode}:`, error);
    return null;
  }
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
