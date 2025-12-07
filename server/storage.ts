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
} from "@shared/schema";
import { db } from "./db";
import {
  workerCases,
  caseAttachments,
  isLegitimateCase,
  medicalCertificates,
  caseDiscussionNotes,
  caseDiscussionInsights,
} from "@shared/schema";
import { evaluateClinicalEvidence } from "./services/clinicalEvidence";
import { eq, desc, asc, inArray, ilike, sql } from "drizzle-orm";

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

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
  getGPNet2CaseById(id: string): Promise<WorkerCase | null>;
  syncWorkerCaseFromFreshdesk(caseData: Partial<WorkerCase>): Promise<void>;
  clearAllWorkerCases(): Promise<void>;
  updateAISummary(caseId: string, summary: string, model: string, workStatusClassification?: string): Promise<void>;
  needsSummaryRefresh(caseId: string): Promise<boolean>;
  getCaseRecoveryTimeline(caseId: string): Promise<MedicalCertificate[]>;
  getCaseDiscussionNotes(caseId: string, limit?: number): Promise<CaseDiscussionNote[]>;
  upsertCaseDiscussionNotes(notes: InsertCaseDiscussionNote[]): Promise<void>;
  getCaseDiscussionInsights(caseId: string, limit?: number): Promise<TranscriptInsight[]>;
  upsertCaseDiscussionInsights(insights: InsertCaseDiscussionInsight[]): Promise<void>;
  findCaseByWorkerName(
    workerName: string,
  ): Promise<{ caseId: string; workerName: string; confidence: number } | null>;
  updateClinicalStatus(caseId: string, status: CaseClinicalStatus): Promise<void>;
  getCaseTimeline(caseId: string, limit?: number): Promise<TimelineEvent[]>;
}

class DbStorage implements IStorage {
  async getGPNet2Cases(): Promise<WorkerCase[]> {
    const dbCases = await db.select().from(workerCases);
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
          workerName: dbCase.workerName,
          company: dbCase.company as any,
          dateOfInjury: dbCase.dateOfInjury.toISOString().split('T')[0],
          riskLevel: dbCase.riskLevel as any,
          workStatus: dbCase.workStatus as any,
          hasCertificate: Boolean(dbCase.hasCertificate || latestCertificate),
          certificateUrl: dbCase.certificateUrl || undefined,
          complianceIndicator: dbCase.complianceIndicator as any,
          compliance: dbCase.complianceJson as any, // Parse JSONB compliance object
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

  async getGPNet2CaseById(id: string): Promise<WorkerCase | null> {
    const dbCase = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, id))
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

    const discussionNotes = await this.getCaseDiscussionNotes(id, 5);
    const discussionInsights = await this.getCaseDiscussionInsights(id, 5);

    const workerCase = dbCase[0];
    const caseData: WorkerCase = {
      id: workerCase.id,
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

  async getCaseRecoveryTimeline(caseId: string): Promise<MedicalCertificate[]> {
    const rows = await db
      .select()
      .from(medicalCertificates)
      .where(eq(medicalCertificates.caseId, caseId))
      .orderBy(asc(medicalCertificates.startDate));

    return rows.map(mapCertificateRow);
  }

  async getCaseDiscussionNotes(
    caseId: string,
    limit: number = 50,
  ): Promise<CaseDiscussionNote[]> {
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
    limit: number = 25,
  ): Promise<TranscriptInsight[]> {
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
  ): Promise<{ caseId: string; workerName: string; confidence: number } | null> {
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
            })
            .from(workerCases);

    let best: { id: string; workerName: string } | null = null;
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

    return { caseId: best.id, workerName: best.workerName, confidence: bestScore };
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

  async updateClinicalStatus(caseId: string, status: CaseClinicalStatus): Promise<void> {
    const existing = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, caseId))
      .limit(1);

    if (!existing.length) {
      throw new Error(`Case not found: ${caseId}`);
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
      .where(eq(workerCases.id, caseId));
  }

  async updateAISummary(caseId: string, summary: string, model: string, workStatusClassification?: string): Promise<void> {
    await db
      .update(workerCases)
      .set({
        aiSummary: summary,
        aiSummaryGeneratedAt: new Date(),
        aiSummaryModel: model,
        aiWorkStatusClassification: workStatusClassification,
        updatedAt: new Date(),
      })
      .where(eq(workerCases.id, caseId));
  }

  async needsSummaryRefresh(caseId: string): Promise<boolean> {
    const dbCase = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, caseId))
      .limit(1);

    if (dbCase.length === 0) {
      return false;
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

  async getCaseTimeline(caseId: string, limit: number = 50): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

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
}

export const storage: IStorage = new DbStorage();
