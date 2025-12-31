import type {
  WorkerCase,
  WorkerCaseDB,
  MedicalCertificate,
  MedicalCertificateInput,
  MedicalCertificateDB,
  InsertMedicalCertificate,
  CaseDiscussionNote,
  CaseDiscussionNoteDB,
  InsertCaseDiscussionNote,
  TranscriptInsight,
  CaseDiscussionInsightDB,
  InsertCaseDiscussionInsight,
  RiskLevel,
  ComplianceIndicator,
  CaseClinicalStatus,
  UserInviteDB,
  InsertUserInvite,
  CertificateExpiryAlertDB,
  InsertCertificateExpiryAlert,
  CaseAction,
  CaseActionDB,
  InsertCaseAction,
  CaseActionType,
  CaseActionStatus,
  TimelineEvent,
  EmailDraftDB,
  InsertEmailDraft,
  NotificationDB,
  InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import {
  workerCases,
  caseAttachments,
  isLegitimateCase,
  medicalCertificates,
  certificateExpiryAlerts,
  caseDiscussionNotes,
  caseDiscussionInsights,
  userInvites,
  caseActions,
  terminationProcesses,
  emailDrafts,
  notifications,
} from "@shared/schema";
import { evaluateClinicalEvidence } from "./services/clinicalEvidence";
import { eq, desc, asc, inArray, ilike, sql, and, lte, gte, or, isNull, ne } from "drizzle-orm";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function normalizeCertificateInput(
  caseId: string,
  cert: MedicalCertificateInput,
): InsertMedicalCertificate | null {
  const issueDate = asDate(cert.issueDate) ?? asDate(cert.startDate);
  const startDate = asDate(cert.startDate) ?? issueDate;
  const endDate = asDate(cert.endDate) ?? startDate;

  if (!issueDate || !startDate || !endDate) {
    return null;
  }

  return {
    caseId,
    issueDate,
    startDate,
    endDate,
    capacity: cert.capacity,
    notes: cert.notes ?? null,
    source: cert.source,
    documentUrl: cert.documentUrl ?? null,
    sourceReference: cert.sourceReference ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapCertificateRow(row: MedicalCertificateDB): MedicalCertificate {
  return {
    id: row.id,
    caseId: row.caseId,
    issueDate: row.issueDate?.toISOString() ?? row.startDate.toISOString(),
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    capacity: row.capacity as MedicalCertificate["capacity"],
    notes: row.notes ?? undefined,
    source: (row.source as MedicalCertificate["source"]) ?? "freshdesk",
    documentUrl: row.documentUrl ?? undefined,
    sourceReference: row.sourceReference ?? undefined,
    createdAt: row.createdAt?.toISOString(),
    updatedAt: row.updatedAt?.toISOString(),
  };
}

function mapDiscussionNote(row: CaseDiscussionNoteDB): CaseDiscussionNote {
  return {
    id: row.id,
    caseId: row.caseId,
    workerName: row.workerName,
    timestamp: row.timestamp?.toISOString() ?? new Date().toISOString(),
    rawText: row.rawText,
    summary: row.summary,
    nextSteps: row.nextSteps ?? undefined,
    riskFlags: row.riskFlags ?? undefined,
    updatesCompliance: row.updatesCompliance ?? false,
    updatesRecoveryTimeline: row.updatesRecoveryTimeline ?? false,
  };
}

function mapDiscussionInsight(row: CaseDiscussionInsightDB): TranscriptInsight {
  return {
    id: row.id,
    noteId: row.noteId,
    caseId: row.caseId,
    area: row.area as TranscriptInsight["area"],
    severity: row.severity as TranscriptInsight["severity"],
    summary: row.summary,
    detail: row.detail ?? undefined,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

const RISK_PRIORITY: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

const COMPLIANCE_PRIORITY: ComplianceIndicator[] = [
  "Very Low",
  "Low",
  "Medium",
  "High",
  "Very High",
];

const MATCH_CONFIDENCE_THRESHOLD = 0.6;

function elevateRiskLevel(current: RiskLevel, incoming: RiskLevel): RiskLevel {
  return RISK_PRIORITY[incoming] > RISK_PRIORITY[current] ? incoming : current;
}

function determineRiskLevelFromNotes(notes: CaseDiscussionNote[]): RiskLevel | null {
  let proposed: RiskLevel | null = null;
  for (const note of notes) {
    const flags = note.riskFlags ?? [];
    if (flags.some((flag) => /critical|non-?compliance|escalation|no show|incident/i.test(flag))) {
      return "High";
    }
    if (
      !proposed &&
      flags.some((flag) => /delay|follow up|concern|at risk|monitor/i.test(flag))
    ) {
      proposed = "Medium";
    }
  }
  return proposed;
}

function escalateComplianceIndicator(
  current: ComplianceIndicator,
  riskFlags?: string[],
): ComplianceIndicator {
  if (!riskFlags || riskFlags.length === 0) {
    return current;
  }
  const currentIndex = COMPLIANCE_PRIORITY.indexOf(current);
  if (currentIndex === -1) {
    return current;
  }
  const hasSeriousRisk = riskFlags.some((flag) =>
    /breach|non-?compliance|escalation|high risk/i.test(flag),
  );
  const shift = hasSeriousRisk ? 2 : 1;
  const nextIndex = Math.min(COMPLIANCE_PRIORITY.length - 1, currentIndex + shift);
  return COMPLIANCE_PRIORITY[nextIndex];
}

function normalizeWorkerNameForMatch(value: string): string {
  return value
    ?.toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreNameMatch(target: string, candidate: string): number {
  if (!target || !candidate) return 0;
  if (target === candidate) return 1;
  if (candidate.includes(target) || target.includes(candidate)) {
    return 0.85;
  }
  const targetParts = new Set(target.split(" "));
  const candidateParts = new Set(candidate.split(" "));
  let overlap = 0;
  targetParts.forEach((part) => {
    if (candidateParts.has(part)) {
      overlap += 1;
    }
  });
  return overlap / Math.max(targetParts.size, 1);
}

const SEVERITY_PRIORITY: Record<TranscriptInsight["severity"], number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

function insightSeverityToRiskLevel(
  severity: TranscriptInsight["severity"],
): RiskLevel {
  if (severity === "critical") return "High";
  if (severity === "warning") return "Medium";
  return "Low";
}

function applyDiscussionInsights(
  workerCase: WorkerCase,
  notes: CaseDiscussionNote[],
  insights: TranscriptInsight[] = [],
): WorkerCase {
  if (notes.length) {
    workerCase.latestDiscussionNotes = notes;
    const latest = notes[0];

    if (latest.nextSteps && latest.nextSteps.length > 0) {
      workerCase.nextStep = latest.nextSteps[0];
    }

    const riskFromNotes = determineRiskLevelFromNotes(notes);
    if (riskFromNotes) {
      workerCase.riskLevel = elevateRiskLevel(workerCase.riskLevel, riskFromNotes);
    }

    if (latest.updatesCompliance) {
      const nowIso = new Date().toISOString();
      const summaryLine = `Transcript ${new Date(latest.timestamp).toLocaleDateString("en-AU")}: ${
        latest.summary
      }`;
      workerCase.compliance = workerCase.compliance ?? {
        indicator: workerCase.complianceIndicator,
        reason: workerCase.summary,
        source: "manual",
        lastChecked: nowIso,
      };
      workerCase.compliance.reason = workerCase.compliance.reason
        ? `${workerCase.compliance.reason}\n${summaryLine}`
        : summaryLine;
      workerCase.compliance.lastChecked = nowIso;
      const updatedIndicator = escalateComplianceIndicator(
        workerCase.compliance.indicator,
        latest.riskFlags,
      );
      workerCase.compliance.indicator = updatedIndicator;
      workerCase.complianceIndicator = updatedIndicator;
    }

    if (latest.updatesRecoveryTimeline && workerCase.latestCertificate) {
      workerCase.latestCertificate.notes = workerCase.latestCertificate.notes
        ? `${workerCase.latestCertificate.notes}\nTranscript insight: ${latest.summary}`
        : `Transcript insight: ${latest.summary}`;
    }
  }

  if (insights.length) {
    workerCase.discussionInsights = insights;
    const strongestRiskInsight = insights
      .filter((insight) =>
        ["risk", "engagement", "returnToWork"].includes(insight.area),
      )
      .sort(
        (a, b) =>
          SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity],
      )[0];

    if (strongestRiskInsight) {
      workerCase.riskLevel = elevateRiskLevel(
        workerCase.riskLevel,
        insightSeverityToRiskLevel(strongestRiskInsight.severity),
      );
    }

    const complianceInsights = insights.filter(
      (insight) => insight.area === "compliance",
    );
    if (complianceInsights.length) {
      const reasonLines = complianceInsights.map(
        (insight) => `[${insight.severity.toUpperCase()}] ${insight.summary}`,
      );
      workerCase.compliance = workerCase.compliance ?? {
        indicator: workerCase.complianceIndicator,
        reason: workerCase.summary,
        source: "manual",
        lastChecked: new Date().toISOString(),
      };
      workerCase.compliance.reason = workerCase.compliance.reason
        ? `${workerCase.compliance.reason}\n${reasonLines.join("\n")}`
        : reasonLines.join("\n");
      const indicatorFromInsight = escalateComplianceIndicator(
        workerCase.compliance.indicator,
        complianceInsights.map((insight) => insight.summary),
      );
      workerCase.compliance.indicator = indicatorFromInsight;
      workerCase.complianceIndicator = indicatorFromInsight;
    }
  } else {
    workerCase.discussionInsights = [];
  }

  return workerCase;
}

export interface PaginatedCasesResult {
  cases: WorkerCase[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface IStorage {
  // Case methods - UPDATED for multi-tenant isolation
  getGPNet2Cases(organizationId: string): Promise<WorkerCase[]>;
  getGPNet2CasesPaginated(organizationId: string, page: number, limit: number): Promise<PaginatedCasesResult>;
  getGPNet2CaseById(id: string, organizationId: string): Promise<WorkerCase | null>;
  getGPNet2CaseByIdAdmin(id: string): Promise<WorkerCase | null>; // Admin-only, no org filter
  syncWorkerCaseFromFreshdesk(caseData: Partial<WorkerCase>): Promise<void>;
  createCase(caseData: {
    organizationId: string;
    workerName: string;
    company: string;
    dateOfInjury: string;
    workStatus: string;
    riskLevel: string;
    summary?: string;
  }): Promise<WorkerCase>;
  clearAllWorkerCases(): Promise<void>;
  updateAISummary(caseId: string, organizationId: string, summary: string, model: string, workStatusClassification?: string): Promise<void>;
  needsSummaryRefresh(caseId: string, organizationId: string): Promise<boolean>;
  getCaseRecoveryTimeline(caseId: string, organizationId: string): Promise<MedicalCertificate[]>;
  getCaseDiscussionNotes(caseId: string, organizationId: string, limit?: number): Promise<CaseDiscussionNote[]>;
  upsertCaseDiscussionNotes(notes: InsertCaseDiscussionNote[]): Promise<void>;
  getCaseDiscussionInsights(caseId: string, organizationId: string, limit?: number): Promise<TranscriptInsight[]>;
  upsertCaseDiscussionInsights(insights: InsertCaseDiscussionInsight[]): Promise<void>;
  findCaseByWorkerName(
    workerName: string,
  ): Promise<{ caseId: string; workerName: string; organizationId: string; confidence: number } | null>;
  updateClinicalStatus(caseId: string, organizationId: string, status: CaseClinicalStatus): Promise<void>;
  getCaseTimeline(caseId: string, organizationId: string, limit?: number): Promise<TimelineEvent[]>;

  // User invite methods
  createUserInvite(invite: InsertUserInvite): Promise<UserInviteDB>;
  getUserInviteByToken(token: string): Promise<UserInviteDB | null>;
  getUserInviteById(id: string): Promise<UserInviteDB | null>;
  updateUserInvite(id: string, updates: Partial<UserInviteDB>): Promise<UserInviteDB>;
  getUserInvitesByOrg(organizationId: string): Promise<UserInviteDB[]>;

  // Certificate Engine v1 - Certificate management (all methods require organizationId for tenant isolation)
  createCertificate(certificate: InsertMedicalCertificate): Promise<MedicalCertificateDB>;
  getCertificate(id: string, organizationId: string): Promise<MedicalCertificateDB | null>;
  getCertificatesByCase(caseId: string, organizationId: string): Promise<MedicalCertificateDB[]>;
  getCertificatesByWorker(workerId: string, organizationId: string): Promise<MedicalCertificateDB[]>;
  getCertificatesByOrganization(organizationId: string): Promise<MedicalCertificateDB[]>;
  updateCertificate(id: string, organizationId: string, updates: Partial<InsertMedicalCertificate>): Promise<MedicalCertificateDB>;
  deleteCertificate(id: string, organizationId: string): Promise<void>;
  getCurrentCertificates(workerId: string, organizationId: string): Promise<MedicalCertificateDB[]>;
  getExpiringCertificates(organizationId: string, daysAhead: number): Promise<MedicalCertificateDB[]>;
  getCertificatesRequiringReview(organizationId: string): Promise<MedicalCertificateDB[]>;
  markCertificateAsReviewed(id: string, organizationId: string, reviewDate: Date): Promise<MedicalCertificateDB>;

  // Certificate Engine v1 - Alert management
  createExpiryAlert(alert: InsertCertificateExpiryAlert): Promise<CertificateExpiryAlertDB>;
  getUnacknowledgedAlerts(organizationId: string): Promise<CertificateExpiryAlertDB[]>;
  acknowledgeAlert(alertId: string, userId: string): Promise<CertificateExpiryAlertDB>;

  // Action Queue v1 - Case Actions - UPDATED for multi-tenant isolation
  createAction(action: InsertCaseAction): Promise<CaseActionDB>;
  getActionById(id: string, organizationId: string): Promise<CaseActionDB | null>;
  getActionByIdAdmin(id: string): Promise<CaseActionDB | null>; // Admin-only, no org filter
  getActionsByCase(caseId: string, organizationId: string): Promise<CaseActionDB[]>;
  getPendingActions(organizationId: string, limit?: number): Promise<CaseAction[]>;
  getOverdueActions(organizationId: string, limit?: number): Promise<CaseAction[]>;
  getAllActionsWithCaseInfo(organizationId: string, options?: { status?: CaseActionStatus; limit?: number }): Promise<CaseAction[]>;
  updateAction(id: string, updates: Partial<InsertCaseAction>): Promise<CaseActionDB>;
  markActionDone(id: string): Promise<CaseActionDB>;
  markActionCancelled(id: string): Promise<CaseActionDB>;
  findPendingActionByTypeAndCase(caseId: string, type: CaseActionType): Promise<CaseActionDB | null>;
  upsertAction(caseId: string, type: CaseActionType, dueDate?: Date, notes?: string): Promise<CaseActionDB>;

  // Email Drafter v1 - Email Draft management - UPDATED for multi-tenant isolation
  createEmailDraft(draft: InsertEmailDraft): Promise<EmailDraftDB>;
  getEmailDraftById(id: string): Promise<EmailDraftDB | null>;
  getEmailDraftsByCase(caseId: string, organizationId: string): Promise<EmailDraftDB[]>;
  updateEmailDraft(id: string, updates: Partial<InsertEmailDraft>): Promise<EmailDraftDB>;
  deleteEmailDraft(id: string): Promise<void>;

  // Notifications Engine v1 - Notification management - UPDATED for multi-tenant isolation
  createNotification(notification: InsertNotification): Promise<NotificationDB>;
  getNotificationById(id: string, organizationId: string): Promise<NotificationDB | null>;
  getPendingNotifications(organizationId: string, limit?: number): Promise<NotificationDB[]>;
  getNotificationsByCase(caseId: string, organizationId: string): Promise<NotificationDB[]>;
  getRecentNotifications(organizationId: string, hours?: number): Promise<NotificationDB[]>;
  updateNotificationStatus(id: string, status: string, failureReason?: string): Promise<NotificationDB>;
  markNotificationSent(id: string): Promise<NotificationDB>;
  notificationExistsByDedupeKey(dedupeKey: string): Promise<boolean>;
  getNotificationStats(organizationId: string): Promise<{ pending: number; sent: number; failed: number }>;

  // Case management - close/override/merge
  closeCase(caseId: string, organizationId: string, reason?: string): Promise<void>;
  setComplianceOverride(
    caseId: string,
    organizationId: string,
    overrideValue: string,
    reason: string,
    overrideBy: string
  ): Promise<void>;
  clearComplianceOverride(caseId: string, organizationId: string): Promise<void>;
  mergeTickets(caseId: string, organizationId: string, masterTicketId: string): Promise<void>;
}

class DbStorage implements IStorage {
  async getGPNet2Cases(organizationId: string): Promise<WorkerCase[]> {
    const dbCases = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.organizationId, organizationId),
        // Filter out closed cases - only show open cases by default
        or(
          eq(workerCases.caseStatus, "open"),
          isNull(workerCases.caseStatus)
        )
      ));
    const caseIds = dbCases.map((dbCase) => dbCase.id);

    const notesByCase = new Map<string, CaseDiscussionNote[]>();
    const insightsByCase = new Map<string, TranscriptInsight[]>();
    if (caseIds.length > 0) {
      const [noteRows, insightRows] = await Promise.all([
        db
          .select()
          .from(caseDiscussionNotes)
          .where(inArray(caseDiscussionNotes.caseId, caseIds))
          .orderBy(desc(caseDiscussionNotes.timestamp)),
        db
          .select()
          .from(caseDiscussionInsights)
          .where(inArray(caseDiscussionInsights.caseId, caseIds))
          .orderBy(desc(caseDiscussionInsights.createdAt)),
      ]);

      for (const row of noteRows) {
        const current = notesByCase.get(row.caseId) ?? [];
        if (current.length >= 3) {
          continue;
        }
        current.push(mapDiscussionNote(row));
        notesByCase.set(row.caseId, current);
      }

      for (const row of insightRows) {
        const list = insightsByCase.get(row.caseId) ?? [];
        if (list.length >= 5) {
          continue;
        }
        list.push(mapDiscussionInsight(row));
        insightsByCase.set(row.caseId, list);
      }
    }

    const casesWithAttachments = await Promise.all(
      dbCases.map(async (dbCase: WorkerCaseDB) => {
        const attachments = await db
          .select()
          .from(caseAttachments)
          .where(eq(caseAttachments.caseId, dbCase.id));

        const latestCertificateRow = await db
          .select()
          .from(medicalCertificates)
          .where(eq(medicalCertificates.caseId, dbCase.id))
          .orderBy(desc(medicalCertificates.startDate))
          .limit(1);

        const latestCertificate = latestCertificateRow[0]
          ? mapCertificateRow(latestCertificateRow[0])
          : undefined;

        const workerCase: WorkerCase = {
          id: dbCase.id,
          organizationId: dbCase.organizationId,
          workerName: dbCase.workerName,
          company: dbCase.company as any,
          dateOfInjury: dbCase.dateOfInjury.toISOString().split('T')[0],
          riskLevel: dbCase.riskLevel as any,
          workStatus: dbCase.workStatus as any,
          hasCertificate: Boolean(dbCase.hasCertificate || latestCertificate),
          certificateUrl: dbCase.certificateUrl || undefined,
          complianceIndicator: dbCase.complianceIndicator as any,
          compliance: dbCase.complianceJson as any, // Parse JSONB compliance object
          complianceOverride: (dbCase as any).complianceOverride || false,
          complianceOverrideValue: (dbCase as any).complianceOverrideValue || undefined,
          complianceOverrideReason: (dbCase as any).complianceOverrideReason || undefined,
          complianceOverrideBy: (dbCase as any).complianceOverrideBy || undefined,
          complianceOverrideAt: (dbCase as any).complianceOverrideAt?.toISOString() || undefined,
          medicalConstraints: dbCase.clinicalStatusJson?.medicalConstraints,
          functionalCapacity: dbCase.clinicalStatusJson?.functionalCapacity,
          rtwPlanStatus: dbCase.clinicalStatusJson?.rtwPlanStatus,
          complianceStatus: dbCase.clinicalStatusJson?.complianceStatus,
          specialistStatus: dbCase.clinicalStatusJson?.specialistStatus,
          specialistReportSummary: dbCase.clinicalStatusJson?.specialistReportSummary,
          currentStatus: dbCase.currentStatus,
          nextStep: dbCase.nextStep,
          owner: dbCase.owner,
          dueDate: dbCase.dueDate,
          summary: dbCase.summary,
          ticketIds: dbCase.ticketIds || [dbCase.id],
          ticketCount: Number(dbCase.ticketCount) || 1,
          masterTicketId: (dbCase as any).masterTicketId || undefined,
          aiSummary: dbCase.aiSummary || undefined,
          aiSummaryGeneratedAt: dbCase.aiSummaryGeneratedAt?.toISOString() || undefined,
          aiSummaryModel: dbCase.aiSummaryModel || undefined,
        aiWorkStatusClassification: dbCase.aiWorkStatusClassification || undefined,
        ticketLastUpdatedAt: dbCase.ticketLastUpdatedAt?.toISOString() || undefined,
        clcLastFollowUp: dbCase.clcLastFollowUp || undefined,
        clcNextFollowUp: dbCase.clcNextFollowUp || undefined,
        employmentStatus: (dbCase as any).employmentStatus || "ACTIVE",
        terminationProcessId: (dbCase as any).terminationProcessId || null,
        terminationReason: (dbCase as any).terminationReason || null,
        terminationAuditFlag: (dbCase as any).terminationAuditFlag || null,
        latestCertificate,
        attachments: attachments.map((att) => ({
          id: att.id,
          name: att.name,
          type: att.type,
            url: att.url,
          })),
        };

        workerCase.clinicalEvidence = evaluateClinicalEvidence(workerCase);
        const discussionNotes = notesByCase.get(dbCase.id) ?? [];
        const discussionInsights = insightsByCase.get(dbCase.id) ?? [];
        return applyDiscussionInsights(workerCase, discussionNotes, discussionInsights);
      })
    );

    return casesWithAttachments;
  }

  async getGPNet2CasesPaginated(organizationId: string, page: number, limit: number): Promise<PaginatedCasesResult> {
    // Get total count first
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(workerCases)
      .where(and(
        eq(workerCases.organizationId, organizationId),
        or(
          eq(workerCases.caseStatus, "open"),
          isNull(workerCases.caseStatus)
        )
      ));

    const total = Number(countResult[0]?.count ?? 0);

    // Get paginated cases
    const offset = (page - 1) * limit;
    const dbCases = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.organizationId, organizationId),
        or(
          eq(workerCases.caseStatus, "open"),
          isNull(workerCases.caseStatus)
        )
      ))
      .orderBy(desc(workerCases.ticketLastUpdatedAt))
      .limit(limit)
      .offset(offset);

    const caseIds = dbCases.map((dbCase) => dbCase.id);

    const notesByCase = new Map<string, CaseDiscussionNote[]>();
    const insightsByCase = new Map<string, TranscriptInsight[]>();

    if (caseIds.length > 0) {
      const [noteRows, insightRows] = await Promise.all([
        db
          .select()
          .from(caseDiscussionNotes)
          .where(inArray(caseDiscussionNotes.caseId, caseIds))
          .orderBy(desc(caseDiscussionNotes.timestamp)),
        db
          .select()
          .from(caseDiscussionInsights)
          .where(inArray(caseDiscussionInsights.caseId, caseIds))
          .orderBy(desc(caseDiscussionInsights.createdAt)),
      ]);

      for (const row of noteRows) {
        const current = notesByCase.get(row.caseId) ?? [];
        if (current.length >= 3) continue;
        current.push(mapDiscussionNote(row));
        notesByCase.set(row.caseId, current);
      }

      for (const row of insightRows) {
        const list = insightsByCase.get(row.caseId) ?? [];
        if (list.length >= 5) continue;
        list.push(mapDiscussionInsight(row));
        insightsByCase.set(row.caseId, list);
      }
    }

    const casesWithAttachments = await Promise.all(
      dbCases.map(async (dbCase: WorkerCaseDB) => {
        const attachments = await db
          .select()
          .from(caseAttachments)
          .where(eq(caseAttachments.caseId, dbCase.id));

        const latestCertificateRow = await db
          .select()
          .from(medicalCertificates)
          .where(eq(medicalCertificates.caseId, dbCase.id))
          .orderBy(desc(medicalCertificates.startDate))
          .limit(1);

        const latestCertificate = latestCertificateRow[0]
          ? mapCertificateRow(latestCertificateRow[0])
          : undefined;

        const workerCase: WorkerCase = {
          id: dbCase.id,
          organizationId: dbCase.organizationId,
          workerName: dbCase.workerName,
          company: dbCase.company as any,
          dateOfInjury: dbCase.dateOfInjury.toISOString().split('T')[0],
          riskLevel: dbCase.riskLevel as any,
          workStatus: dbCase.workStatus as any,
          hasCertificate: Boolean(dbCase.hasCertificate || latestCertificate),
          certificateUrl: dbCase.certificateUrl || undefined,
          complianceIndicator: dbCase.complianceIndicator as any,
          compliance: dbCase.complianceJson as any,
          complianceOverride: (dbCase as any).complianceOverride || false,
          complianceOverrideValue: (dbCase as any).complianceOverrideValue || undefined,
          complianceOverrideReason: (dbCase as any).complianceOverrideReason || undefined,
          complianceOverrideBy: (dbCase as any).complianceOverrideBy || undefined,
          complianceOverrideAt: (dbCase as any).complianceOverrideAt?.toISOString() || undefined,
          medicalConstraints: dbCase.clinicalStatusJson?.medicalConstraints,
          functionalCapacity: dbCase.clinicalStatusJson?.functionalCapacity,
          rtwPlanStatus: dbCase.clinicalStatusJson?.rtwPlanStatus,
          complianceStatus: dbCase.clinicalStatusJson?.complianceStatus,
          specialistStatus: dbCase.clinicalStatusJson?.specialistStatus,
          specialistReportSummary: dbCase.clinicalStatusJson?.specialistReportSummary,
          currentStatus: dbCase.currentStatus,
          nextStep: dbCase.nextStep,
          owner: dbCase.owner,
          dueDate: dbCase.dueDate,
          summary: dbCase.summary,
          ticketIds: dbCase.ticketIds || [dbCase.id],
          ticketCount: Number(dbCase.ticketCount) || 1,
          masterTicketId: (dbCase as any).masterTicketId || undefined,
          aiSummary: dbCase.aiSummary || undefined,
          aiSummaryGeneratedAt: dbCase.aiSummaryGeneratedAt?.toISOString() || undefined,
          aiSummaryModel: dbCase.aiSummaryModel || undefined,
          aiWorkStatusClassification: dbCase.aiWorkStatusClassification || undefined,
          ticketLastUpdatedAt: dbCase.ticketLastUpdatedAt?.toISOString() || undefined,
          clcLastFollowUp: dbCase.clcLastFollowUp || undefined,
          clcNextFollowUp: dbCase.clcNextFollowUp || undefined,
          employmentStatus: (dbCase as any).employmentStatus || "ACTIVE",
          terminationProcessId: (dbCase as any).terminationProcessId || null,
          terminationReason: (dbCase as any).terminationReason || null,
          terminationAuditFlag: (dbCase as any).terminationAuditFlag || null,
          latestCertificate,
          attachments: attachments.map((att) => ({
            id: att.id,
            name: att.name,
            type: att.type,
            url: att.url,
          })),
        };

        workerCase.clinicalEvidence = evaluateClinicalEvidence(workerCase);
        const discussionNotes = notesByCase.get(dbCase.id) ?? [];
        const discussionInsights = insightsByCase.get(dbCase.id) ?? [];
        return applyDiscussionInsights(workerCase, discussionNotes, discussionInsights);
      })
    );

    return {
      cases: casesWithAttachments,
      total,
      page,
      limit,
      hasMore: offset + casesWithAttachments.length < total,
    };
  }

  async getGPNet2CaseById(id: string, organizationId: string): Promise<WorkerCase | null> {
    const dbCase = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.id, id),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (dbCase.length === 0) {
      return null;
    }

    const attachments = await db
      .select()
      .from(caseAttachments)
      .where(eq(caseAttachments.caseId, id));

    const latestCertificateRow = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, id))
      .orderBy(desc(medicalCertificates.startDate))
      .limit(1);

    const latestCertificate = latestCertificateRow[0]
      ? mapCertificateRow(latestCertificateRow[0])
      : undefined;

    const discussionNotes = await this.getCaseDiscussionNotes(id, organizationId, 5);
    const discussionInsights = await this.getCaseDiscussionInsights(id, organizationId, 5);

    const workerCase = dbCase[0];
    const caseData: WorkerCase = {
      id: workerCase.id,
      organizationId: workerCase.organizationId,
      workerName: workerCase.workerName,
      company: workerCase.company as any,
      dateOfInjury: workerCase.dateOfInjury.toISOString().split('T')[0],
      riskLevel: workerCase.riskLevel as any,
      workStatus: workerCase.workStatus as any,
      hasCertificate: workerCase.hasCertificate,
      certificateUrl: workerCase.certificateUrl || undefined,
      complianceIndicator: workerCase.complianceIndicator as any,
      compliance: workerCase.complianceJson as any, // Parse JSONB compliance object
      medicalConstraints: workerCase.clinicalStatusJson?.medicalConstraints,
      functionalCapacity: workerCase.clinicalStatusJson?.functionalCapacity,
      rtwPlanStatus: workerCase.clinicalStatusJson?.rtwPlanStatus,
      complianceStatus: workerCase.clinicalStatusJson?.complianceStatus,
      specialistStatus: workerCase.clinicalStatusJson?.specialistStatus,
      specialistReportSummary: workerCase.clinicalStatusJson?.specialistReportSummary,
      currentStatus: workerCase.currentStatus,
      nextStep: workerCase.nextStep,
      owner: workerCase.owner,
      dueDate: workerCase.dueDate,
      summary: workerCase.summary,
      ticketIds: workerCase.ticketIds || [workerCase.id],
      ticketCount: Number(workerCase.ticketCount) || 1,
      aiSummary: workerCase.aiSummary || undefined,
      aiSummaryGeneratedAt: workerCase.aiSummaryGeneratedAt?.toISOString() || undefined,
      aiSummaryModel: workerCase.aiSummaryModel || undefined,
      aiWorkStatusClassification: workerCase.aiWorkStatusClassification || undefined,
      ticketLastUpdatedAt: workerCase.ticketLastUpdatedAt?.toISOString() || undefined,
      clcLastFollowUp: workerCase.clcLastFollowUp || undefined,
      clcNextFollowUp: workerCase.clcNextFollowUp || undefined,
      employmentStatus: (workerCase as any).employmentStatus || "ACTIVE",
      terminationProcessId: (workerCase as any).terminationProcessId || null,
      terminationReason: (workerCase as any).terminationReason || null,
      terminationAuditFlag: (workerCase as any).terminationAuditFlag || null,
      latestCertificate,
      attachments: attachments.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        url: att.url,
      })),
    };

    caseData.clinicalEvidence = evaluateClinicalEvidence(caseData);
    return applyDiscussionInsights(caseData, discussionNotes, discussionInsights);
  }

  async getGPNet2CaseByIdAdmin(id: string): Promise<WorkerCase | null> {
    // Admin version - NO organization filter (can access any case)
    const dbCase = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, id))
      .limit(1);

    if (dbCase.length === 0) {
      return null;
    }

    const workerCase = dbCase[0];
    const organizationId = workerCase.organizationId;

    const attachments = await db
      .select()
      .from(caseAttachments)
      .where(eq(caseAttachments.caseId, id));

    const latestCertificateRow = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, id))
      .orderBy(desc(medicalCertificates.startDate))
      .limit(1);

    const latestCertificate = latestCertificateRow[0]
      ? mapCertificateRow(latestCertificateRow[0])
      : undefined;

    const discussionNotes = await this.getCaseDiscussionNotes(id, organizationId, 5);
    const discussionInsights = await this.getCaseDiscussionInsights(id, organizationId, 5);

    const caseData: WorkerCase = {
      id: workerCase.id,
      organizationId: workerCase.organizationId,
      workerName: workerCase.workerName,
      company: workerCase.company as any,
      dateOfInjury: workerCase.dateOfInjury.toISOString().split('T')[0],
      riskLevel: workerCase.riskLevel as any,
      workStatus: workerCase.workStatus as any,
      hasCertificate: workerCase.hasCertificate,
      certificateUrl: workerCase.certificateUrl || undefined,
      complianceIndicator: workerCase.complianceIndicator as any,
      compliance: workerCase.complianceJson as any,
      medicalConstraints: workerCase.clinicalStatusJson?.medicalConstraints,
      functionalCapacity: workerCase.clinicalStatusJson?.functionalCapacity,
      rtwPlanStatus: workerCase.clinicalStatusJson?.rtwPlanStatus,
      complianceStatus: workerCase.clinicalStatusJson?.complianceStatus,
      specialistStatus: workerCase.clinicalStatusJson?.specialistStatus,
      specialistReportSummary: workerCase.clinicalStatusJson?.specialistReportSummary,
      currentStatus: workerCase.currentStatus,
      nextStep: workerCase.nextStep,
      owner: workerCase.owner,
      dueDate: workerCase.dueDate,
      summary: workerCase.summary,
      ticketIds: workerCase.ticketIds || [workerCase.id],
      ticketCount: Number(workerCase.ticketCount) || 1,
      aiSummary: workerCase.aiSummary || undefined,
      aiSummaryGeneratedAt: workerCase.aiSummaryGeneratedAt?.toISOString() || undefined,
      aiSummaryModel: workerCase.aiSummaryModel || undefined,
      aiWorkStatusClassification: workerCase.aiWorkStatusClassification || undefined,
      ticketLastUpdatedAt: workerCase.ticketLastUpdatedAt?.toISOString() || undefined,
      clcLastFollowUp: workerCase.clcLastFollowUp || undefined,
      clcNextFollowUp: workerCase.clcNextFollowUp || undefined,
      employmentStatus: (workerCase as any).employmentStatus || "ACTIVE",
      terminationProcessId: (workerCase as any).terminationProcessId || null,
      terminationReason: (workerCase as any).terminationReason || null,
      terminationAuditFlag: (workerCase as any).terminationAuditFlag || null,
      latestCertificate,
      attachments: attachments.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        url: att.url,
      })),
    };

    caseData.clinicalEvidence = evaluateClinicalEvidence(caseData);
    return applyDiscussionInsights(caseData, discussionNotes, discussionInsights);
  }

  async createCase(caseData: {
    organizationId: string;
    workerName: string;
    company: string;
    dateOfInjury: string;
    workStatus: string;
    riskLevel: string;
    summary?: string;
  }): Promise<WorkerCase> {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const [inserted] = await db
      .insert(workerCases)
      .values({
        organizationId: caseData.organizationId,
        workerName: caseData.workerName,
        company: caseData.company,
        dateOfInjury: new Date(caseData.dateOfInjury),
        workStatus: caseData.workStatus,
        riskLevel: caseData.riskLevel,
        hasCertificate: false,
        complianceIndicator: "Medium",
        currentStatus: "New claim - awaiting initial assessment",
        nextStep: "Schedule initial contact with worker",
        owner: "Unassigned",
        dueDate: dueDate.toISOString().split("T")[0],
        summary: caseData.summary || `New claim for ${caseData.workerName}`,
        ticketIds: [],
        ticketCount: "1",
      })
      .returning();

    // Return the created case in WorkerCase format
    const workerCase: WorkerCase = {
      id: inserted.id,
      organizationId: inserted.organizationId,
      workerName: inserted.workerName,
      company: inserted.company as any,
      dateOfInjury: inserted.dateOfInjury.toISOString().split("T")[0],
      riskLevel: inserted.riskLevel as any,
      workStatus: inserted.workStatus as any,
      hasCertificate: false,
      complianceIndicator: inserted.complianceIndicator as any,
      currentStatus: inserted.currentStatus,
      nextStep: inserted.nextStep,
      owner: inserted.owner,
      dueDate: inserted.dueDate,
      summary: inserted.summary,
      ticketIds: [],
      ticketCount: 1,
    };

    return workerCase;
  }

  async getCaseRecoveryTimeline(caseId: string, organizationId: string): Promise<MedicalCertificate[]> {
    // Verify case ownership before returning timeline
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }
    const rows = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, caseId))
      .orderBy(asc(medicalCertificates.startDate));

    return rows.map(mapCertificateRow);
  }

  async getCaseDiscussionNotes(
    caseId: string,
    organizationId: string,
    limit: number = 50,
  ): Promise<CaseDiscussionNote[]> {
    // Verify case ownership before returning notes
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    const rows = await db
      .select()
      .from(caseDiscussionNotes)
      .where(eq(caseDiscussionNotes.caseId, caseId))
      .orderBy(desc(caseDiscussionNotes.timestamp))
      .limit(limit);

    return rows.map(mapDiscussionNote);
  }

  async upsertCaseDiscussionNotes(notes: InsertCaseDiscussionNote[]): Promise<void> {
    if (!notes.length) {
      return;
    }

    await db
      .insert(caseDiscussionNotes)
      .values(notes)
      .onConflictDoUpdate({
        target: caseDiscussionNotes.id,
        set: {
          workerName: sql`excluded.worker_name`,
          timestamp: sql`excluded.timestamp`,
          rawText: sql`excluded.raw_text`,
          summary: sql`excluded.summary`,
          nextSteps: sql`excluded.next_steps`,
          riskFlags: sql`excluded.risk_flags`,
          updatesCompliance: sql`excluded.updates_compliance`,
          updatesRecoveryTimeline: sql`excluded.updates_recovery_timeline`,
        },
      });
  }

  async getCaseDiscussionInsights(
    caseId: string,
    organizationId: string,
    limit: number = 25,
  ): Promise<TranscriptInsight[]> {
    // Verify case ownership before returning insights
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    const rows = await db
      .select()
      .from(caseDiscussionInsights)
      .where(eq(caseDiscussionInsights.caseId, caseId))
      .orderBy(desc(caseDiscussionInsights.createdAt))
      .limit(limit);

    return rows.map(mapDiscussionInsight);
  }

  async upsertCaseDiscussionInsights(
    insights: InsertCaseDiscussionInsight[],
  ): Promise<void> {
    if (!insights.length) {
      return;
    }

    await db
      .insert(caseDiscussionInsights)
      .values(insights)
      .onConflictDoUpdate({
        target: caseDiscussionInsights.id,
        set: {
          summary: sql`excluded.summary`,
          detail: sql`excluded.detail`,
          area: sql`excluded.area`,
          severity: sql`excluded.severity`,
          noteId: sql`excluded.note_id`,
          caseId: sql`excluded.case_id`,
          createdAt: sql`excluded.created_at`,
        },
      });
  }

  async findCaseByWorkerName(
    workerName: string,
  ): Promise<{ caseId: string; workerName: string; organizationId: string; confidence: number } | null> {
    const normalizedTarget = normalizeWorkerNameForMatch(workerName);
    if (!normalizedTarget) {
      return null;
    }

    const tokens = normalizedTarget.split(" ");
    const searchTerm = tokens[tokens.length - 1];

    const initialCandidates = await db
      .select({
        id: workerCases.id,
        workerName: workerCases.workerName,
        organizationId: workerCases.organizationId,
      })
      .from(workerCases)
      .where(ilike(workerCases.workerName, `%${searchTerm}%`));

    const candidateRows =
      initialCandidates.length > 0
        ? initialCandidates
        : await db
            .select({
              id: workerCases.id,
              workerName: workerCases.workerName,
              organizationId: workerCases.organizationId,
            })
            .from(workerCases);

    let best: { id: string; workerName: string; organizationId: string } | null = null;
    let bestScore = 0;

    for (const row of candidateRows) {
      const normalizedCandidate = normalizeWorkerNameForMatch(row.workerName);
      const score = scoreNameMatch(normalizedTarget, normalizedCandidate);
      if (score > bestScore) {
        best = row;
        bestScore = score;
      }
      if (score === 1) {
        break;
      }
    }

    if (!best) {
      return null;
    }

    if (bestScore < MATCH_CONFIDENCE_THRESHOLD) {
      console.warn(
        `[Transcripts] Fuzzy worker match below threshold (${bestScore.toFixed(
          2,
        )}) for "${workerName}" => "${best.workerName}"`,
      );
      return null;
    }

    return { caseId: best.id, workerName: best.workerName, organizationId: best.organizationId, confidence: bestScore };
  }

  async syncWorkerCaseFromFreshdesk(caseData: Partial<WorkerCase>): Promise<void> {
    if (!caseData.id) {
      throw new Error("Case ID is required for sync");
    }

    // Defensive guard: Skip syncing if not a legitimate case (filters out generic emails)
    if (!isLegitimateCase(caseData as WorkerCase)) {
      console.warn(`[Storage] Skipping sync for non-legitimate case: CaseID=${caseData.id}, Worker="${caseData.workerName}", Company="${caseData.company}"`);
      return;
    }

    const existingCase = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, caseData.id))
      .limit(1);

    const dateOfInjury = caseData.dateOfInjury 
      ? (typeof caseData.dateOfInjury === 'string' ? new Date(caseData.dateOfInjury) : caseData.dateOfInjury)
      : new Date();

    const incomingTicketUpdatedAt = caseData.ticketLastUpdatedAt 
      ? (typeof caseData.ticketLastUpdatedAt === 'string' ? new Date(caseData.ticketLastUpdatedAt) : caseData.ticketLastUpdatedAt)
      : null;

    // Only update ticketLastUpdatedAt if incoming timestamp is newer
    let ticketLastUpdatedAt = incomingTicketUpdatedAt;
    if (existingCase.length > 0 && existingCase[0].ticketLastUpdatedAt) {
      const existingTimestamp = existingCase[0].ticketLastUpdatedAt;
      if (incomingTicketUpdatedAt && existingTimestamp && existingTimestamp > incomingTicketUpdatedAt) {
        ticketLastUpdatedAt = existingTimestamp; // Keep existing if it's newer
      }
    }

    const incomingClinicalStatus: CaseClinicalStatus = {};
    if (caseData.medicalConstraints !== undefined) {
      incomingClinicalStatus.medicalConstraints = caseData.medicalConstraints;
    }
    if (caseData.functionalCapacity !== undefined) {
      incomingClinicalStatus.functionalCapacity = caseData.functionalCapacity;
    }
    if (caseData.rtwPlanStatus !== undefined) {
      incomingClinicalStatus.rtwPlanStatus = caseData.rtwPlanStatus;
    }
    if (caseData.complianceStatus !== undefined) {
      incomingClinicalStatus.complianceStatus = caseData.complianceStatus;
    }
    if (caseData.specialistStatus !== undefined) {
      incomingClinicalStatus.specialistStatus = caseData.specialistStatus;
    }
    if (caseData.specialistReportSummary !== undefined) {
      incomingClinicalStatus.specialistReportSummary = caseData.specialistReportSummary;
    }

    const hasIncomingClinicalStatus = Object.keys(incomingClinicalStatus).length > 0;
    const existingClinicalStatus = existingCase[0]?.clinicalStatusJson ?? null;
    const mergedClinicalStatus: CaseClinicalStatus | null = hasIncomingClinicalStatus
      ? { ...(existingClinicalStatus ?? {}), ...incomingClinicalStatus }
      : existingClinicalStatus;

    const hasCertificate =
      Boolean(caseData.hasCertificate) ||
      Boolean(caseData.certificateHistory && caseData.certificateHistory.length > 0);
    const latestCertificateDoc =
      caseData.certificateHistory && caseData.certificateHistory.length > 0
        ? caseData.certificateHistory[caseData.certificateHistory.length - 1].documentUrl
        : undefined;

    const dbData = {
      id: caseData.id,
      organizationId: caseData.organizationId || existingCase[0]?.organizationId || "default",
      workerName: caseData.workerName || "Unknown",
      company: caseData.company || "Unknown",
      dateOfInjury,
      riskLevel: caseData.riskLevel || "Low",
      workStatus: caseData.workStatus || "Off work",
      hasCertificate,
      certificateUrl: caseData.certificateUrl || latestCertificateDoc || null,
      complianceIndicator: caseData.complianceIndicator || "Low",
      complianceJson: caseData.compliance || null, // Store full compliance object as JSONB
      clinicalStatusJson: mergedClinicalStatus ?? null,
      currentStatus: caseData.currentStatus || "New case",
      nextStep: caseData.nextStep || "Review",
      owner: caseData.owner || "CLC Team",
      dueDate: caseData.dueDate || "TBD",
      summary: caseData.summary || "",
      ticketIds: caseData.ticketIds || [caseData.id],
      ticketCount: String(caseData.ticketCount || 1),
      ticketLastUpdatedAt,
      clcLastFollowUp: caseData.clcLastFollowUp || null,
      clcNextFollowUp: caseData.clcNextFollowUp || null,
      updatedAt: new Date(),
    };

    if (existingCase.length > 0) {
      // Preserve AI summary fields when updating from Freshdesk
      const existing = existingCase[0];
      await db
        .update(workerCases)
        .set({
          ...dbData,
          aiSummary: existing.aiSummary,
          aiSummaryGeneratedAt: existing.aiSummaryGeneratedAt,
          aiSummaryModel: existing.aiSummaryModel,
          aiWorkStatusClassification: existing.aiWorkStatusClassification,
          clinicalStatusJson: mergedClinicalStatus ?? existing.clinicalStatusJson ?? null,
        })
        .where(eq(workerCases.id, caseData.id));
    } else {
      await db.insert(workerCases).values(dbData);
    }

    await this.syncMedicalCertificates(caseData.id, caseData.certificateHistory);
  }

  private async syncMedicalCertificates(
    caseId: string,
    certificates?: MedicalCertificateInput[],
  ): Promise<void> {
    if (!certificates || certificates.length === 0) {
      return;
    }

    const normalized = certificates
      .map((cert) => normalizeCertificateInput(caseId, cert))
      .filter((cert): cert is InsertMedicalCertificate => Boolean(cert));

    if (normalized.length === 0) {
      return;
    }

    const existing = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, caseId));

    const seen = new Set(
      existing.map((row) => {
        const start = row.startDate.toISOString();
        const end = row.endDate.toISOString();
        const capacity = row.capacity;
        const reference = row.sourceReference ?? "";
        const doc = row.documentUrl ?? "";
        return `${start}|${end}|${capacity}|${reference}|${doc}`;
      }),
    );

    const newRows = normalized.filter((row) => {
      const start = row.startDate.toISOString();
      const end = row.endDate.toISOString();
      const reference = row.sourceReference ?? "";
      const doc = row.documentUrl ?? "";
      const key = `${start}|${end}|${row.capacity}|${reference}|${doc}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    if (newRows.length === 0) {
      return;
    }

    await db.insert(medicalCertificates).values(newRows);
  }

  async clearAllWorkerCases(): Promise<void> {
    await db.delete(caseDiscussionInsights);
    await db.delete(caseDiscussionNotes);
    await db.delete(medicalCertificates);
    await db.delete(caseAttachments);
    await db.delete(workerCases);
  }

  async updateClinicalStatus(caseId: string, organizationId: string, status: CaseClinicalStatus): Promise<void> {
    const existing = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (!existing.length) {
      throw new Error(`Case not found or access denied: ${caseId}`);
    }

    const merged: CaseClinicalStatus = {
      ...(existing[0].clinicalStatusJson ?? {}),
      ...status,
    };

    await db
      .update(workerCases)
      .set({
        clinicalStatusJson: Object.keys(merged).length > 0 ? merged : null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async updateAISummary(caseId: string, organizationId: string, summary: string, model: string, workStatusClassification?: string): Promise<void> {
    // Only update if the case belongs to the organization
    await db
      .update(workerCases)
      .set({
        aiSummary: summary,
        aiSummaryGeneratedAt: new Date(),
        aiSummaryModel: model,
        aiWorkStatusClassification: workStatusClassification,
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async closeCase(caseId: string, organizationId: string, reason?: string): Promise<void> {
    await db
      .update(workerCases)
      .set({
        caseStatus: "closed",
        closedAt: new Date(),
        closedReason: reason || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async setComplianceOverride(
    caseId: string,
    organizationId: string,
    overrideValue: string,
    reason: string,
    overrideBy: string
  ): Promise<void> {
    await db
      .update(workerCases)
      .set({
        complianceOverride: true,
        complianceOverrideValue: overrideValue,
        complianceOverrideReason: reason,
        complianceOverrideBy: overrideBy,
        complianceOverrideAt: new Date(),
        complianceIndicator: overrideValue, // Also update the main indicator
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async clearComplianceOverride(caseId: string, organizationId: string): Promise<void> {
    await db
      .update(workerCases)
      .set({
        complianceOverride: false,
        complianceOverrideValue: null,
        complianceOverrideReason: null,
        complianceOverrideBy: null,
        complianceOverrideAt: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async mergeTickets(
    caseId: string,
    organizationId: string,
    masterTicketId: string
  ): Promise<void> {
    await db
      .update(workerCases)
      .set({
        masterTicketId: masterTicketId,
        ticketCount: "1", // After merge, only master ticket counts
        updatedAt: new Date(),
      })
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ));
  }

  async needsSummaryRefresh(caseId: string, organizationId: string): Promise<boolean> {
    const dbCase = await db
      .select()
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (dbCase.length === 0) {
      return false; // Case not found or access denied
    }

    const workerCase = dbCase[0];

    // Need refresh if summary doesn't exist
    if (!workerCase.aiSummary || !workerCase.aiSummaryGeneratedAt) {
      return true;
    }

    // Need refresh if ticket was updated after summary was generated
    // Compare as timestamps (both are Date objects from database)
    if (workerCase.ticketLastUpdatedAt && workerCase.aiSummaryGeneratedAt) {
      const ticketTime = workerCase.ticketLastUpdatedAt.getTime();
      const summaryTime = workerCase.aiSummaryGeneratedAt.getTime();
      return ticketTime > summaryTime;
    }

    return false;
  }

  async getCaseTimeline(caseId: string, organizationId: string, limit: number = 50): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // Verify case ownership before building timeline
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    // Fetch all sources in parallel
    const [certificates, notes, attachments, workerCaseRows, terminationRows] = await Promise.all([
      db.select().from(medicalCertificates).where(eq(medicalCertificates.caseId, caseId)),
      db.select().from(caseDiscussionNotes).where(eq(caseDiscussionNotes.caseId, caseId)),
      db.select().from(caseAttachments).where(eq(caseAttachments.caseId, caseId)),
      db.select().from(workerCases).where(eq(workerCases.id, caseId)).limit(1),
      db.select().from(terminationProcesses).where(eq(terminationProcesses.workerCaseId, caseId)).limit(1)
    ]);

    const formatDate = (date: Date) => date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

    // Transform certificates
    for (const cert of certificates) {
      events.push({
        id: `cert-${cert.id}`,
        caseId,
        eventType: "certificate_added",
        timestamp: cert.createdAt?.toISOString() ?? cert.issueDate.toISOString(),
        title: "Medical Certificate Added",
        description: `Capacity: ${cert.capacity} | ${formatDate(cert.startDate)} - ${formatDate(cert.endDate)}`,
        metadata: { capacity: cert.capacity, startDate: cert.startDate.toISOString(), endDate: cert.endDate.toISOString(), notes: cert.notes },
        sourceId: cert.id,
        sourceTable: "medical_certificates",
        icon: "medical_information",
        severity: cert.capacity === "unfit" ? "warning" : "info"
      });
    }

    // Transform discussion notes
    for (const note of notes) {
      const hasCriticalFlags = note.riskFlags?.some((flag: string) => /critical|non-compliance|escalation|no show/i.test(flag));
      events.push({
        id: `note-${note.id}`,
        caseId,
        eventType: "discussion_note",
        timestamp: note.timestamp?.toISOString() ?? new Date().toISOString(),
        title: "Discussion Note Added",
        description: note.summary,
        metadata: { riskFlags: note.riskFlags, nextSteps: note.nextSteps, updatesCompliance: note.updatesCompliance, updatesRecoveryTimeline: note.updatesRecoveryTimeline },
        sourceId: note.id,
        sourceTable: "case_discussion_notes",
        icon: "forum",
        severity: hasCriticalFlags ? "critical" : "info"
      });
    }

    // Transform attachments
    for (const att of attachments) {
      events.push({
        id: `att-${att.id}`,
        caseId,
        eventType: "attachment_uploaded",
        timestamp: att.createdAt?.toISOString() ?? new Date().toISOString(),
        title: "Document Uploaded",
        description: `${att.name} (${att.type})`,
        metadata: { name: att.name, type: att.type, url: att.url },
        sourceId: att.id,
        sourceTable: "case_attachments",
        icon: "attach_file",
        severity: "info"
      });
    }

    // Transform termination milestones
    if (terminationRows.length > 0) {
      const term = terminationRows[0];
      const milestones = [
        { date: term.agentMeetingDate, title: "Agent Meeting Held", icon: "handshake", severity: "info" },
        { date: term.consultantInviteDate, title: "Consultant Invited", icon: "send", severity: "info" },
        { date: term.consultantAppointmentDate, title: "Consultant Appointment", icon: "person_search", severity: "info" },
        { date: term.preTerminationInviteSentDate, title: "Pre-Termination Invite Sent", icon: "mail", severity: "warning" },
        { date: term.preTerminationMeetingDate, title: "Pre-Termination Meeting", icon: "gavel", severity: "warning" },
        { date: term.decisionDate, title: `Termination Decision: ${term.decision}`, icon: "check_circle", severity: "critical" },
        { date: term.terminationEffectiveDate, title: "Employment Terminated", icon: "cancel", severity: "critical" }
      ];
      for (let idx = 0; idx < milestones.length; idx++) {
        const milestone = milestones[idx];
        if (milestone.date) {
          events.push({
            id: `term-${term.id}-${idx}`,
            caseId,
            eventType: "termination_milestone",
            timestamp: milestone.date.toISOString(),
            title: milestone.title,
            description: `Termination Status: ${term.status}`,
            metadata: { status: term.status, decision: term.decision, terminationReason: term.decisionRationale },
            sourceId: term.id,
            sourceTable: "termination_processes",
            icon: milestone.icon,
            severity: milestone.severity as "info" | "warning" | "critical"
          });
        }
      }
    }

    // Add case created event
    if (workerCaseRows.length > 0) {
      const wc = workerCaseRows[0];
      events.push({
        id: `case-created-${wc.id}`,
        caseId,
        eventType: "case_created",
        timestamp: wc.createdAt?.toISOString() ?? new Date().toISOString(),
        title: "Case Created",
        description: `Worker: ${wc.workerName} | Company: ${wc.company}`,
        metadata: { company: wc.company, workerName: wc.workerName, dateOfInjury: wc.dateOfInjury.toISOString(), initialStatus: wc.currentStatus },
        sourceId: wc.id,
        sourceTable: "worker_cases",
        icon: "person_add",
        severity: "info"
      });
    }

    // Sort by timestamp descending (most recent first)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events.slice(0, limit);
  }

  // User invite methods
  async createUserInvite(invite: InsertUserInvite): Promise<UserInviteDB> {
    const [created] = await db.insert(userInvites).values(invite).returning();
    return created;
  }

  async getUserInviteByToken(token: string): Promise<UserInviteDB | null> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.token, token))
      .limit(1);
    return invite || null;
  }

  async getUserInviteById(id: string): Promise<UserInviteDB | null> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.id, id))
      .limit(1);
    return invite || null;
  }

  async updateUserInvite(id: string, updates: Partial<UserInviteDB>): Promise<UserInviteDB> {
    const [updated] = await db
      .update(userInvites)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userInvites.id, id))
      .returning();
    return updated;
  }

  async getUserInvitesByOrg(organizationId: string): Promise<UserInviteDB[]> {
    return await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.organizationId, organizationId))
      .orderBy(desc(userInvites.createdAt));
  }

  // Certificate Engine v1 - Certificate management methods
  async createCertificate(certificate: InsertMedicalCertificate): Promise<MedicalCertificateDB> {
    const [result] = await db.insert(medicalCertificates)
      .values(certificate)
      .returning();
    return result;
  }

  async getCertificate(id: string, organizationId: string): Promise<MedicalCertificateDB | null> {
    const result = await db.select()
      .from(medicalCertificates)
      .where(and(
        eq(medicalCertificates.id, id),
        eq(medicalCertificates.organizationId, organizationId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async getCertificatesByCase(caseId: string, organizationId: string): Promise<MedicalCertificateDB[]> {
    // Verify case ownership before returning certificates
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    return await db.select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, caseId))
      .orderBy(desc(medicalCertificates.issueDate));
  }

  async getCertificatesByWorker(workerId: string, organizationId: string): Promise<MedicalCertificateDB[]> {
    return await db.select()
      .from(medicalCertificates)
      .where(and(
        eq(medicalCertificates.workerId, workerId),
        eq(medicalCertificates.organizationId, organizationId)
      ))
      .orderBy(desc(medicalCertificates.issueDate));
  }

  async getCertificatesByOrganization(organizationId: string): Promise<MedicalCertificateDB[]> {
    return await db.select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.organizationId, organizationId))
      .orderBy(desc(medicalCertificates.issueDate));
  }

  async updateCertificate(id: string, organizationId: string, updates: Partial<InsertMedicalCertificate>): Promise<MedicalCertificateDB> {
    const [result] = await db.update(medicalCertificates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(medicalCertificates.id, id),
        eq(medicalCertificates.organizationId, organizationId)
      ))
      .returning();
    return result;
  }

  async deleteCertificate(id: string, organizationId: string): Promise<void> {
    await db.delete(medicalCertificates)
      .where(and(
        eq(medicalCertificates.id, id),
        eq(medicalCertificates.organizationId, organizationId)
      ));
  }

  async getCurrentCertificates(workerId: string, organizationId: string): Promise<MedicalCertificateDB[]> {
    return await db.select()
      .from(medicalCertificates)
      .where(and(
        eq(medicalCertificates.workerId, workerId),
        eq(medicalCertificates.organizationId, organizationId),
        eq(medicalCertificates.isCurrentCertificate, true)
      ))
      .orderBy(desc(medicalCertificates.endDate));
  }

  async getExpiringCertificates(organizationId: string, daysAhead: number): Promise<MedicalCertificateDB[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysAhead);

    return await db.select()
      .from(medicalCertificates)
      .where(and(
        eq(medicalCertificates.organizationId, organizationId),
        lte(medicalCertificates.endDate, expiryDate),
        gte(medicalCertificates.endDate, new Date())
      ))
      .orderBy(medicalCertificates.endDate);
  }

  async getCertificatesRequiringReview(organizationId: string): Promise<MedicalCertificateDB[]> {
    return await db.select()
      .from(medicalCertificates)
      .where(and(
        eq(medicalCertificates.organizationId, organizationId),
        eq(medicalCertificates.requiresReview, true)
      ))
      .orderBy(desc(medicalCertificates.createdAt));
  }

  async markCertificateAsReviewed(id: string, organizationId: string, reviewDate: Date): Promise<MedicalCertificateDB> {
    const [result] = await db.update(medicalCertificates)
      .set({ requiresReview: false, reviewDate, updatedAt: new Date() })
      .where(and(
        eq(medicalCertificates.id, id),
        eq(medicalCertificates.organizationId, organizationId)
      ))
      .returning();
    return result;
  }

  // Certificate Engine v1 - Alert management methods
  async createExpiryAlert(alert: InsertCertificateExpiryAlert): Promise<CertificateExpiryAlertDB> {
    const [result] = await db.insert(certificateExpiryAlerts)
      .values(alert)
      .onConflictDoNothing()
      .returning();
    return result;
  }

  async getUnacknowledgedAlerts(organizationId: string): Promise<CertificateExpiryAlertDB[]> {
    const results = await db.select({
      alert: certificateExpiryAlerts,
    })
      .from(certificateExpiryAlerts)
      .innerJoin(medicalCertificates, eq(certificateExpiryAlerts.certificateId, medicalCertificates.id))
      .where(and(
        eq(medicalCertificates.organizationId, organizationId),
        eq(certificateExpiryAlerts.acknowledged, false)
      ))
      .orderBy(certificateExpiryAlerts.alertDate);

    return results.map(r => r.alert);
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<CertificateExpiryAlertDB> {
    const [result] = await db.update(certificateExpiryAlerts)
      .set({ acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() })
      .where(eq(certificateExpiryAlerts.id, alertId))
      .returning();
    return result;
  }

  // Action Queue v1 - Case Action methods
  async createAction(action: InsertCaseAction): Promise<CaseActionDB> {
    const [result] = await db.insert(caseActions)
      .values(action)
      .returning();
    return result;
  }

  async getActionById(id: string, organizationId: string): Promise<CaseActionDB | null> {
    const [result] = await db.select()
      .from(caseActions)
      .where(and(
        eq(caseActions.id, id),
        eq(caseActions.organizationId, organizationId)
      ))
      .limit(1);
    return result || null;
  }

  async getActionByIdAdmin(id: string): Promise<CaseActionDB | null> {
    // Admin version - NO organization filter (can access any action)
    const [result] = await db.select()
      .from(caseActions)
      .where(eq(caseActions.id, id))
      .limit(1);
    return result || null;
  }

  async getActionsByCase(caseId: string, organizationId: string): Promise<CaseActionDB[]> {
    // Verify case ownership before returning actions
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    return await db.select()
      .from(caseActions)
      .where(eq(caseActions.caseId, caseId))
      .orderBy(desc(caseActions.dueDate));
  }

  async getPendingActions(organizationId: string, limit: number = 50): Promise<CaseAction[]> {
    const results = await db.select({
      action: caseActions,
      workerName: workerCases.workerName,
      company: workerCases.company,
    })
      .from(caseActions)
      .innerJoin(workerCases, eq(caseActions.caseId, workerCases.id))
      .where(and(
        eq(caseActions.status, "pending"),
        eq(workerCases.organizationId, organizationId)
      ))
      .orderBy(asc(caseActions.dueDate))
      .limit(limit);

    return results.map(r => ({
      id: r.action.id,
      organizationId: r.action.organizationId,
      caseId: r.action.caseId,
      type: r.action.type as CaseActionType,
      status: r.action.status as CaseActionStatus,
      dueDate: r.action.dueDate?.toISOString(),
      priority: r.action.priority ?? 1,
      notes: r.action.notes ?? undefined,
      workerName: r.workerName,
      company: r.company,
      createdAt: r.action.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.action.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async getOverdueActions(organizationId: string, limit: number = 50): Promise<CaseAction[]> {
    const now = new Date();
    const results = await db.select({
      action: caseActions,
      workerName: workerCases.workerName,
      company: workerCases.company,
    })
      .from(caseActions)
      .innerJoin(workerCases, eq(caseActions.caseId, workerCases.id))
      .where(and(
        eq(caseActions.status, "pending"),
        lte(caseActions.dueDate, now),
        eq(workerCases.organizationId, organizationId)
      ))
      .orderBy(asc(caseActions.dueDate))
      .limit(limit);

    return results.map(r => ({
      id: r.action.id,
      organizationId: r.action.organizationId,
      caseId: r.action.caseId,
      type: r.action.type as CaseActionType,
      status: r.action.status as CaseActionStatus,
      dueDate: r.action.dueDate?.toISOString(),
      priority: r.action.priority ?? 1,
      notes: r.action.notes ?? undefined,
      workerName: r.workerName,
      company: r.company,
      createdAt: r.action.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.action.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async getAllActionsWithCaseInfo(organizationId: string, options?: { status?: CaseActionStatus; limit?: number }): Promise<CaseAction[]> {
    const limit = options?.limit ?? 100;

    let query = db.select({
      action: caseActions,
      workerName: workerCases.workerName,
      company: workerCases.company,
    })
      .from(caseActions)
      .innerJoin(workerCases, eq(caseActions.caseId, workerCases.id));

    // Build WHERE clause with organization filter
    const conditions = [eq(workerCases.organizationId, organizationId)];
    if (options?.status) {
      conditions.push(eq(caseActions.status, options.status));
    }

    query = query.where(and(...conditions)) as typeof query;

    const results = await query
      .orderBy(asc(caseActions.dueDate))
      .limit(limit);

    return results.map(r => ({
      id: r.action.id,
      organizationId: r.action.organizationId,
      caseId: r.action.caseId,
      type: r.action.type as CaseActionType,
      status: r.action.status as CaseActionStatus,
      dueDate: r.action.dueDate?.toISOString(),
      priority: r.action.priority ?? 1,
      notes: r.action.notes ?? undefined,
      workerName: r.workerName,
      company: r.company,
      createdAt: r.action.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: r.action.updatedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async updateAction(id: string, updates: Partial<InsertCaseAction>): Promise<CaseActionDB> {
    const [result] = await db.update(caseActions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(caseActions.id, id))
      .returning();
    return result;
  }

  async markActionDone(id: string): Promise<CaseActionDB> {
    const [result] = await db.update(caseActions)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(caseActions.id, id))
      .returning();
    return result;
  }

  async markActionCancelled(id: string): Promise<CaseActionDB> {
    const [result] = await db.update(caseActions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(caseActions.id, id))
      .returning();
    return result;
  }

  async findPendingActionByTypeAndCase(caseId: string, type: CaseActionType): Promise<CaseActionDB | null> {
    const [result] = await db.select()
      .from(caseActions)
      .where(and(
        eq(caseActions.caseId, caseId),
        eq(caseActions.type, type),
        eq(caseActions.status, "pending")
      ))
      .limit(1);
    return result || null;
  }

  async upsertAction(caseId: string, type: CaseActionType, dueDate?: Date, notes?: string): Promise<CaseActionDB> {
    // Check if a pending action of this type already exists for the case
    const existing = await this.findPendingActionByTypeAndCase(caseId, type);

    if (existing) {
      // Update the existing action if needed (e.g., new due date)
      if (dueDate || notes) {
        return await this.updateAction(existing.id, {
          dueDate: dueDate ?? existing.dueDate ?? undefined,
          notes: notes ?? existing.notes ?? undefined,
        });
      }
      return existing;
    }

    // Get the organizationId from the worker case
    const [workerCase] = await db.select({ organizationId: workerCases.organizationId })
      .from(workerCases)
      .where(eq(workerCases.id, caseId))
      .limit(1);

    if (!workerCase) {
      throw new Error(`Worker case not found: ${caseId}`);
    }

    // Create a new action
    return await this.createAction({
      organizationId: workerCase.organizationId,
      caseId,
      type,
      status: "pending",
      dueDate,
      notes,
      priority: 1,
    });
  }

  // Email Drafter v1 - Email Draft management
  async createEmailDraft(draft: InsertEmailDraft): Promise<EmailDraftDB> {
    const [result] = await db.insert(emailDrafts).values(draft).returning();
    return result;
  }

  async getEmailDraftById(id: string): Promise<EmailDraftDB | null> {
    const [result] = await db.select()
      .from(emailDrafts)
      .where(eq(emailDrafts.id, id))
      .limit(1);
    return result || null;
  }

  async getEmailDraftsByCase(caseId: string, organizationId: string): Promise<EmailDraftDB[]> {
    // Verify case ownership before returning email drafts
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    return await db.select()
      .from(emailDrafts)
      .where(eq(emailDrafts.caseId, caseId))
      .orderBy(desc(emailDrafts.createdAt));
  }

  async updateEmailDraft(id: string, updates: Partial<InsertEmailDraft>): Promise<EmailDraftDB> {
    const [result] = await db.update(emailDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(emailDrafts.id, id))
      .returning();
    return result;
  }

  async deleteEmailDraft(id: string): Promise<void> {
    await db.delete(emailDrafts).where(eq(emailDrafts.id, id));
  }

  // Notifications Engine v1 - Notification management
  async createNotification(notification: InsertNotification): Promise<NotificationDB> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotificationById(id: string, organizationId: string): Promise<NotificationDB | null> {
    const [result] = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.organizationId, organizationId)
      ))
      .limit(1);
    return result || null;
  }

  async getPendingNotifications(organizationId: string, limit: number = 100): Promise<NotificationDB[]> {
    return await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.status, "pending"),
        eq(notifications.organizationId, organizationId)
      ))
      .orderBy(
        desc(sql`CASE WHEN ${notifications.priority} = 'critical' THEN 0
                      WHEN ${notifications.priority} = 'high' THEN 1
                      WHEN ${notifications.priority} = 'medium' THEN 2
                      ELSE 3 END`),
        asc(notifications.createdAt)
      )
      .limit(limit);
  }

  async getNotificationsByCase(caseId: string, organizationId: string): Promise<NotificationDB[]> {
    // Verify case ownership before returning notifications
    const caseCheck = await db
      .select({ id: workerCases.id })
      .from(workerCases)
      .where(and(
        eq(workerCases.id, caseId),
        eq(workerCases.organizationId, organizationId)
      ))
      .limit(1);

    if (caseCheck.length === 0) {
      return []; // Case not found or access denied
    }

    return await db.select()
      .from(notifications)
      .where(eq(notifications.caseId, caseId))
      .orderBy(desc(notifications.createdAt));
  }

  async getRecentNotifications(organizationId: string, hours: number = 24): Promise<NotificationDB[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db.select()
      .from(notifications)
      .where(and(
        gte(notifications.createdAt, cutoff),
        eq(notifications.organizationId, organizationId)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async updateNotificationStatus(id: string, status: string, failureReason?: string): Promise<NotificationDB> {
    const updates: Partial<NotificationDB> = { status };
    if (failureReason) {
      updates.failureReason = failureReason;
    }
    if (status === "sent") {
      updates.sentAt = new Date();
    }
    const [result] = await db.update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return result;
  }

  async markNotificationSent(id: string): Promise<NotificationDB> {
    const [result] = await db.update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return result;
  }

  async notificationExistsByDedupeKey(dedupeKey: string): Promise<boolean> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.dedupeKey, dedupeKey),
        eq(notifications.status, "pending")
      ));
    return (result?.count ?? 0) > 0;
  }

  async getNotificationStats(organizationId: string): Promise<{ pending: number; sent: number; failed: number }> {
    const results = await db.select({
      status: notifications.status,
      count: sql<number>`count(*)::int`,
    })
      .from(notifications)
      .where(eq(notifications.organizationId, organizationId))
      .groupBy(notifications.status);

    const stats = { pending: 0, sent: 0, failed: 0 };
    for (const row of results) {
      if (row.status === "pending") stats.pending = row.count;
      else if (row.status === "sent") stats.sent = row.count;
      else if (row.status === "failed") stats.failed = row.count;
    }
    return stats;
  }
}

export const storage: IStorage = new DbStorage();
