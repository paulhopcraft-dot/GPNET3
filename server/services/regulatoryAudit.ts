import { randomUUID } from "crypto";

// Regulatory Compliance & Audit Trail Engine
// Comprehensive logging for compliance, dispute resolution, and regulatory audits

export type AuditEventType =
  | "authentication"
  | "case_modification"
  | "rtw_plan_change"
  | "certificate_action"
  | "document_action"
  | "communication"
  | "automation_execution"
  | "compliance_check"
  | "data_export"
  | "user_action"
  | "system_event";

export type AuditSeverity = "info" | "warning" | "critical";

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: string;

  // Actor information
  userId?: string;
  userName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;

  // Target information
  entityType?: "case" | "worker" | "document" | "certificate" | "rtw_plan" | "user" | "system";
  entityId?: string;
  entityName?: string;

  // Change details
  action: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  changeReason?: string;

  // Context
  automationRule?: string;
  triggeredBy?: string;
  sessionId?: string;
  requestId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

export interface AuditFilter {
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  userId?: string;
  entityType?: string;
  entityId?: string;
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface AuditExportOptions {
  caseId?: string;
  dateFrom?: string;
  dateTo?: string;
  eventTypes?: AuditEventType[];
  format: "json" | "csv" | "pdf_summary";
  includeMetadata?: boolean;
  includeSystemEvents?: boolean;
}

export interface AuditBundle {
  id: string;
  generatedAt: string;
  generatedBy: string;
  exportOptions: AuditExportOptions;
  eventCount: number;
  dateRange: { from: string; to: string };
  summary: AuditSummary;
  events: AuditEvent[];
  caseInfo?: {
    caseId: string;
    workerName: string;
    company: string;
    status: string;
  };
}

export interface AuditSummary {
  totalEvents: number;
  byType: Record<AuditEventType, number>;
  bySeverity: Record<AuditSeverity, number>;
  uniqueUsers: number;
  criticalEvents: number;
  automationEvents: number;
  dateRange: { earliest: string; latest: string };
}

export interface ComplianceCheck {
  id: string;
  checkType: string;
  status: "pass" | "fail" | "warning" | "pending";
  description: string;
  requirement: string;
  evidence?: string;
  checkedAt: string;
  expiresAt?: string;
  remediationRequired?: boolean;
  remediationAction?: string;
}

export interface RetentionPolicy {
  eventType: AuditEventType;
  retentionDays: number;
  archiveAfterDays: number;
  requiresApproval: boolean;
}

// In-memory audit store (would be database in production)
const auditStore: AuditEvent[] = [];
const complianceChecks: Map<string, ComplianceCheck[]> = new Map();

// Default retention policies
const RETENTION_POLICIES: RetentionPolicy[] = [
  { eventType: "authentication", retentionDays: 365, archiveAfterDays: 730, requiresApproval: false },
  { eventType: "case_modification", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true }, // 7 years
  { eventType: "rtw_plan_change", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true },
  { eventType: "certificate_action", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true },
  { eventType: "document_action", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true },
  { eventType: "communication", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true },
  { eventType: "automation_execution", retentionDays: 1095, archiveAfterDays: 1825, requiresApproval: false }, // 3 years
  { eventType: "compliance_check", retentionDays: 2555, archiveAfterDays: 3650, requiresApproval: true },
  { eventType: "data_export", retentionDays: 1095, archiveAfterDays: 1825, requiresApproval: false },
  { eventType: "user_action", retentionDays: 365, archiveAfterDays: 730, requiresApproval: false },
  { eventType: "system_event", retentionDays: 180, archiveAfterDays: 365, requiresApproval: false },
];

/**
 * Log an audit event
 */
export function logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
  const auditEvent: AuditEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  auditStore.push(auditEvent);

  // Keep only last 10000 events in memory (production would use database)
  if (auditStore.length > 10000) {
    auditStore.shift();
  }

  return auditEvent;
}

/**
 * Log authentication event
 */
export function logAuthEvent(
  action: "login" | "logout" | "login_failed" | "password_change" | "session_expired",
  userId: string,
  userName: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "authentication",
    severity: success ? "info" : "warning",
    userId,
    userName,
    ipAddress,
    userAgent,
    action,
    description: success
      ? `User ${userName} ${action.replace("_", " ")}`
      : `Failed ${action.replace("_", " ")} attempt for ${userName}: ${failureReason || "unknown reason"}`,
    metadata: { success, failureReason },
  });
}

/**
 * Log case modification
 */
export function logCaseModification(
  caseId: string,
  caseName: string,
  field: string,
  previousValue: string,
  newValue: string,
  userId: string,
  userName: string,
  reason?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "case_modification",
    severity: "info",
    userId,
    userName,
    entityType: "case",
    entityId: caseId,
    entityName: caseName,
    action: `modified_${field}`,
    description: `${userName} modified ${field} for case ${caseName}`,
    previousValue,
    newValue,
    changeReason: reason,
  });
}

/**
 * Log RTW plan change
 */
export function logRTWPlanChange(
  caseId: string,
  caseName: string,
  changeType: "created" | "updated" | "phase_advanced" | "phase_adjusted" | "completed" | "cancelled",
  details: string,
  userId: string,
  userName: string,
  previousValue?: string,
  newValue?: string,
  reason?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "rtw_plan_change",
    severity: changeType === "cancelled" ? "warning" : "info",
    userId,
    userName,
    entityType: "rtw_plan",
    entityId: caseId,
    entityName: caseName,
    action: changeType,
    description: `${userName} ${changeType.replace("_", " ")} RTW plan for ${caseName}: ${details}`,
    previousValue,
    newValue,
    changeReason: reason,
  });
}

/**
 * Log certificate action
 */
export function logCertificateAction(
  certificateId: string,
  caseId: string,
  action: "uploaded" | "verified" | "rejected" | "expired" | "superseded",
  userId: string,
  userName: string,
  details?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "certificate_action",
    severity: action === "rejected" || action === "expired" ? "warning" : "info",
    userId,
    userName,
    entityType: "certificate",
    entityId: certificateId,
    action,
    description: `Certificate ${action} for case ${caseId}${details ? `: ${details}` : ""}`,
    metadata: { caseId },
  });
}

/**
 * Log automation execution
 */
export function logAutomationExecution(
  automationRule: string,
  triggeredBy: string,
  targetEntity: string,
  targetId: string,
  action: string,
  success: boolean,
  details?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "automation_execution",
    severity: success ? "info" : "warning",
    automationRule,
    triggeredBy,
    entityId: targetId,
    entityName: targetEntity,
    action,
    description: `Automation "${automationRule}" ${success ? "executed" : "failed"}: ${action}${details ? ` - ${details}` : ""}`,
    metadata: { success, targetEntity },
  });
}

/**
 * Log communication
 */
export function logCommunication(
  caseId: string,
  channel: "email" | "sms" | "letter" | "phone" | "portal",
  direction: "inbound" | "outbound",
  recipient: string,
  subject: string,
  userId?: string,
  userName?: string
): AuditEvent {
  return logAuditEvent({
    eventType: "communication",
    severity: "info",
    userId,
    userName,
    entityType: "case",
    entityId: caseId,
    action: `${direction}_${channel}`,
    description: `${direction === "outbound" ? "Sent" : "Received"} ${channel} ${direction === "outbound" ? "to" : "from"} ${recipient}: ${subject}`,
    metadata: { channel, direction, recipient },
  });
}

/**
 * Log compliance check
 */
export function logComplianceCheck(
  caseId: string,
  checkType: string,
  status: ComplianceCheck["status"],
  requirement: string,
  evidence?: string
): AuditEvent {
  const check: ComplianceCheck = {
    id: randomUUID(),
    checkType,
    status,
    description: `${checkType} compliance check`,
    requirement,
    evidence,
    checkedAt: new Date().toISOString(),
    remediationRequired: status === "fail",
  };

  // Store compliance check
  const caseChecks = complianceChecks.get(caseId) || [];
  caseChecks.push(check);
  complianceChecks.set(caseId, caseChecks);

  return logAuditEvent({
    eventType: "compliance_check",
    severity: status === "fail" ? "critical" : status === "warning" ? "warning" : "info",
    entityType: "case",
    entityId: caseId,
    action: `compliance_${status}`,
    description: `${checkType}: ${status.toUpperCase()} - ${requirement}`,
    metadata: { checkType, status, requirement },
  });
}

/**
 * Query audit events
 */
export function queryAuditEvents(filter: AuditFilter): AuditEvent[] {
  let results = [...auditStore];

  if (filter.eventTypes && filter.eventTypes.length > 0) {
    results = results.filter(e => filter.eventTypes!.includes(e.eventType));
  }

  if (filter.severity && filter.severity.length > 0) {
    results = results.filter(e => filter.severity!.includes(e.severity));
  }

  if (filter.userId) {
    results = results.filter(e => e.userId === filter.userId);
  }

  if (filter.entityType) {
    results = results.filter(e => e.entityType === filter.entityType);
  }

  if (filter.entityId) {
    results = results.filter(e => e.entityId === filter.entityId);
  }

  if (filter.caseId) {
    results = results.filter(e =>
      e.entityId === filter.caseId ||
      (e.metadata && (e.metadata as Record<string, unknown>).caseId === filter.caseId)
    );
  }

  if (filter.dateFrom) {
    results = results.filter(e => e.timestamp >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    results = results.filter(e => e.timestamp <= filter.dateTo!);
  }

  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    results = results.filter(e =>
      e.description.toLowerCase().includes(query) ||
      e.action.toLowerCase().includes(query) ||
      (e.userName && e.userName.toLowerCase().includes(query)) ||
      (e.entityName && e.entityName.toLowerCase().includes(query))
    );
  }

  return results.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get case audit trail
 */
export function getCaseAuditTrail(caseId: string): AuditEvent[] {
  return queryAuditEvents({ caseId });
}

/**
 * Generate audit summary
 */
export function generateAuditSummary(events: AuditEvent[]): AuditSummary {
  const byType: Record<AuditEventType, number> = {} as Record<AuditEventType, number>;
  const bySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 };
  const uniqueUsers = new Set<string>();
  let criticalEvents = 0;
  let automationEvents = 0;

  for (const event of events) {
    byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    bySeverity[event.severity]++;

    if (event.userId) uniqueUsers.add(event.userId);
    if (event.severity === "critical") criticalEvents++;
    if (event.eventType === "automation_execution") automationEvents++;
  }

  const timestamps = events.map(e => e.timestamp).sort();

  return {
    totalEvents: events.length,
    byType,
    bySeverity,
    uniqueUsers: uniqueUsers.size,
    criticalEvents,
    automationEvents,
    dateRange: {
      earliest: timestamps[0] || new Date().toISOString(),
      latest: timestamps[timestamps.length - 1] || new Date().toISOString(),
    },
  };
}

/**
 * Export audit bundle
 */
export function exportAuditBundle(
  options: AuditExportOptions,
  exportedBy: string,
  caseInfo?: AuditBundle["caseInfo"]
): AuditBundle {
  const filter: AuditFilter = {
    caseId: options.caseId,
    dateFrom: options.dateFrom,
    dateTo: options.dateTo,
    eventTypes: options.eventTypes,
  };

  let events = queryAuditEvents(filter);

  if (!options.includeSystemEvents) {
    events = events.filter(e => e.eventType !== "system_event");
  }

  const summary = generateAuditSummary(events);

  const bundle: AuditBundle = {
    id: randomUUID(),
    generatedAt: new Date().toISOString(),
    generatedBy: exportedBy,
    exportOptions: options,
    eventCount: events.length,
    dateRange: summary.dateRange,
    summary,
    events: options.includeMetadata ? events : events.map(e => {
      const { metadata, ...rest } = e;
      return rest;
    }),
    caseInfo,
  };

  // Log the export action
  logAuditEvent({
    eventType: "data_export",
    severity: "info",
    userId: exportedBy,
    action: "audit_export",
    description: `Audit bundle exported: ${events.length} events${options.caseId ? ` for case ${options.caseId}` : ""}`,
    metadata: { bundleId: bundle.id, eventCount: events.length },
  });

  return bundle;
}

/**
 * Format audit bundle as CSV
 */
export function formatAuditAsCSV(events: AuditEvent[]): string {
  const headers = [
    "Timestamp",
    "Event Type",
    "Severity",
    "User",
    "Action",
    "Entity Type",
    "Entity ID",
    "Description",
    "Previous Value",
    "New Value",
    "Reason",
  ];

  const rows = events.map(e => [
    e.timestamp,
    e.eventType,
    e.severity,
    e.userName || e.userId || "System",
    e.action,
    e.entityType || "",
    e.entityId || "",
    `"${(e.description || "").replace(/"/g, '""')}"`,
    `"${(e.previousValue || "").replace(/"/g, '""')}"`,
    `"${(e.newValue || "").replace(/"/g, '""')}"`,
    `"${(e.changeReason || "").replace(/"/g, '""')}"`,
  ]);

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
}

/**
 * Get compliance checks for a case
 */
export function getCaseComplianceChecks(caseId: string): ComplianceCheck[] {
  return complianceChecks.get(caseId) || [];
}

/**
 * Run compliance checks for a case
 */
export function runComplianceChecks(
  caseId: string,
  caseData: {
    hasCertificate: boolean;
    certificateExpired: boolean;
    hasRTWPlan: boolean;
    lastContactDays: number;
    hasIncidentReport: boolean;
    injuryReportedWithin24h: boolean;
  }
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];

  // Certificate compliance
  if (!caseData.hasCertificate) {
    logComplianceCheck(caseId, "certificate_required", "fail",
      "Active medical certificate required for all injury cases", "No certificate on file");
    checks.push({
      id: randomUUID(),
      checkType: "certificate_required",
      status: "fail",
      description: "Medical certificate compliance",
      requirement: "Active medical certificate required",
      checkedAt: new Date().toISOString(),
      remediationRequired: true,
      remediationAction: "Obtain and upload current medical certificate",
    });
  } else if (caseData.certificateExpired) {
    logComplianceCheck(caseId, "certificate_current", "fail",
      "Medical certificate must be current (not expired)", "Certificate has expired");
    checks.push({
      id: randomUUID(),
      checkType: "certificate_current",
      status: "fail",
      description: "Certificate currency check",
      requirement: "Certificate must not be expired",
      checkedAt: new Date().toISOString(),
      remediationRequired: true,
      remediationAction: "Request updated certificate from treating practitioner",
    });
  } else {
    logComplianceCheck(caseId, "certificate_compliant", "pass",
      "Valid medical certificate on file", "Current certificate verified");
    checks.push({
      id: randomUUID(),
      checkType: "certificate_compliant",
      status: "pass",
      description: "Certificate compliance",
      requirement: "Valid certificate on file",
      evidence: "Current certificate verified",
      checkedAt: new Date().toISOString(),
    });
  }

  // RTW plan compliance
  if (!caseData.hasRTWPlan) {
    logComplianceCheck(caseId, "rtw_plan_required", "warning",
      "RTW plan should be established within 10 days of injury notification", "No RTW plan on file");
    checks.push({
      id: randomUUID(),
      checkType: "rtw_plan_required",
      status: "warning",
      description: "RTW plan compliance",
      requirement: "RTW plan within 10 days",
      checkedAt: new Date().toISOString(),
      remediationRequired: true,
      remediationAction: "Develop RTW plan with worker and treating practitioner",
    });
  }

  // Contact compliance (WorkSafe requirement: contact within 3 days)
  if (caseData.lastContactDays > 3) {
    logComplianceCheck(caseId, "contact_frequency", "warning",
      "Regular contact with injured worker required", `Last contact ${caseData.lastContactDays} days ago`);
    checks.push({
      id: randomUUID(),
      checkType: "contact_frequency",
      status: "warning",
      description: "Contact frequency compliance",
      requirement: "Contact worker at least every 3 days",
      checkedAt: new Date().toISOString(),
      remediationRequired: true,
      remediationAction: "Contact worker to check on progress and wellbeing",
    });
  }

  // Incident report compliance
  if (!caseData.hasIncidentReport) {
    logComplianceCheck(caseId, "incident_report_required", "fail",
      "Incident report must be completed for all workplace injuries", "No incident report on file");
    checks.push({
      id: randomUUID(),
      checkType: "incident_report_required",
      status: "fail",
      description: "Incident report compliance",
      requirement: "Incident report required",
      checkedAt: new Date().toISOString(),
      remediationRequired: true,
      remediationAction: "Complete and upload incident report",
    });
  } else if (!caseData.injuryReportedWithin24h) {
    logComplianceCheck(caseId, "incident_report_timeliness", "warning",
      "Injuries should be reported within 24 hours", "Report submitted late");
    checks.push({
      id: randomUUID(),
      checkType: "incident_report_timeliness",
      status: "warning",
      description: "Incident report timeliness",
      requirement: "Report within 24 hours",
      checkedAt: new Date().toISOString(),
    });
  }

  return checks;
}

/**
 * Get retention policies
 */
export function getRetentionPolicies(): RetentionPolicy[] {
  return [...RETENTION_POLICIES];
}

/**
 * Get audit statistics
 */
export function getAuditStats(daysBack: number = 30): {
  totalEvents: number;
  eventsToday: number;
  criticalToday: number;
  byType: Record<string, number>;
  recentActivity: AuditEvent[];
} {
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const recentEvents = auditStore.filter(e => new Date(e.timestamp) >= cutoff);
  const todayEvents = recentEvents.filter(e => new Date(e.timestamp) >= todayStart);

  const byType: Record<string, number> = {};
  for (const event of recentEvents) {
    byType[event.eventType] = (byType[event.eventType] || 0) + 1;
  }

  return {
    totalEvents: recentEvents.length,
    eventsToday: todayEvents.length,
    criticalToday: todayEvents.filter(e => e.severity === "critical").length,
    byType,
    recentActivity: recentEvents.slice(0, 20),
  };
}

/**
 * Initialize with sample audit data
 */
export function initializeSampleAuditData(): void {
  if (auditStore.length > 0) return;

  // Add some sample events
  logAuthEvent("login", "user-1", "John Admin", true, "192.168.1.1");
  logCaseModification("1", "Case #1", "workStatus", "Off work", "Modified duties", "user-1", "John Admin", "Medical clearance");
  logRTWPlanChange("1", "Case #1", "phase_advanced", "Advanced to Phase 2: 50% capacity", "user-1", "John Admin", "Phase 1", "Phase 2");
  logCertificateAction("cert-1", "1", "uploaded", "user-1", "John Admin", "WorkCover certificate");
  logAutomationExecution("certificate_expiry_check", "scheduler", "Case #1", "1", "sent_expiry_reminder", true, "7 days until expiry");
  logCommunication("1", "email", "outbound", "worker@email.com", "RTW Plan Update", "user-1", "John Admin");
}

// Initialize sample data
initializeSampleAuditData();
