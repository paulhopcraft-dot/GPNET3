import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// GPNet2 Dashboard Types
export type CompanyName = "Symmetry" | "Allied Health" | "Apex Labour" | "SafeWorks" | "Core Industrial";
export type WorkStatus = "At work" | "Off work";
export type RiskLevel = "High" | "Medium" | "Low";
export type ComplianceIndicator = "Very High" | "High" | "Medium" | "Low" | "Very Low";
export type WorkCapacity = "fit" | "partial" | "unfit" | "unknown";
export interface MedicalConstraints {
  // Negative constraints – what the worker MUST NOT do
  noLiftingOverKg?: number;
  noBending?: boolean;
  noTwisting?: boolean;
  noProlongedStanding?: boolean;
  noProlongedSitting?: boolean;
  noDriving?: boolean;
  noClimbing?: boolean;
  otherConstraints?: string;

  // Positive capacity markers
  suitableForLightDuties?: boolean;
  suitableForSeatedWork?: boolean;
  suitableForModifiedHours?: boolean;

  lastUpdatedBy?: "GP" | "Physiotherapist" | "Specialist" | "CaseManager" | "Unknown";
  lastUpdatedAt?: string;
}

export interface FunctionalCapacity {
  canLiftKg?: number;
  canStandMinutes?: number;
  canSitMinutes?: number;
  canWalkMinutes?: number;
  maxWorkHoursPerDay?: number;
  maxWorkDaysPerWeek?: number;
  otherCapacityNotes?: string;
}

export type RTWPlanStatus =
  | "not_planned"
  | "planned_not_started"
  | "in_progress"
  | "working_well"
  | "failing"
  | "on_hold"
  | "completed";

export type ComplianceStatus =
  | "unknown"
  | "compliant"
  | "partially_compliant"
  | "non_compliant";

export type SpecialistStatus =
  | "none"
  | "referred"
  | "appointment_booked"
  | "seen_waiting_report"
  | "report_received"
  | "did_not_attend"
  | "not_required";

export interface SpecialistReportSummary {
  specialistType?: string;
  specialistName?: string;
  lastAppointmentDate?: string;
  diagnosisSummary?: string;
  improving?: boolean | null;
  surgeryLikely?: boolean | null;
  surgeryPlannedDate?: string | null;
  functionalSummary?: string;
  recommendations?: string;
  rawSource?: string;
}

export interface CaseClinicalStatus {
  medicalConstraints?: MedicalConstraints;
  functionalCapacity?: FunctionalCapacity;
  rtwPlanStatus?: RTWPlanStatus;
  complianceStatus?: ComplianceStatus;
  specialistStatus?: SpecialistStatus;
  specialistReportSummary?: SpecialistReportSummary;
}

export type DutySafetyStatus = "safe" | "unsafe" | "unknown";

export interface ClinicalEvidenceFlag {
  code:
    | "MISSING_TREATMENT_PLAN"
    | "CERTIFICATE_OUT_OF_DATE"
    | "NO_RECENT_CERTIFICATE"
    | "CERTIFICATE_EXPIRING_SOON"
    | "NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE"
    | "SPECIALIST_REFERRED_NO_APPOINTMENT"
    | "SPECIALIST_APPOINTMENT_OVERDUE"
    | "SPECIALIST_SEEN_NO_REPORT"
    | "SPECIALIST_REPORT_OUTDATED"
    | "RTW_PLAN_FAILING"
    | "WORKER_NON_COMPLIANT"
    | "EVIDENCE_INCOMPLETE"
    | "OVERDUE_FOLLOW_UP"
    | "WORKER_DISENGAGED"
    | "LONG_TAIL_CASE"
    | "PSYCHOLOGICAL_INJURY_MARKER"
    | "OTHER";
  severity: "info" | "warning" | "high_risk";
  message: string;
  details?: string;
}

export interface ClinicalEvidenceEvaluation {
  caseId: string;
  hasCurrentTreatmentPlan: boolean;
  hasCurrentCertificate: boolean;
  isImprovingOnExpectedTimeline: boolean | null;
  dutySafetyStatus: DutySafetyStatus;
  specialistStatus: SpecialistStatus;
  specialistReportPresent: boolean;
  specialistReportCurrent: boolean | null;
  rtwPlanStatus?: RTWPlanStatus;
  complianceStatus?: ComplianceStatus;
  flags: ClinicalEvidenceFlag[];
  lastClinicalUpdateDate?: string;
  recommendedActions?: ClinicalActionRecommendation[];
}

export type ActionTarget =
  | "WORKER"
  | "EMPLOYER_INTERNAL"
  | "GP"
  | "PHYSIOTHERAPIST"
  | "SPECIALIST"
  | "INSURER";

export type ClinicalActionType =
  | "REQUEST_TREATMENT_PLAN"
  | "REQUEST_UPDATED_CERTIFICATE"
  | "REQUEST_CLINICAL_EXPLANATION_FOR_DELAY"
  | "REQUEST_SPECIALIST_APPOINTMENT_STATUS"
  | "REQUEST_SPECIALIST_REPORT"
  | "ESCALATE_NON_COMPLIANCE_TO_INSURER"
  | "REVIEW_RTW_PLAN_WITH_GP"
  | "REVIEW_DUTIES_WITH_WORKER"
  | "DOCUMENT_EVIDENCE_GAP"
  | "OTHER";

export interface ClinicalActionRecommendation {
  id: string;
  type: ClinicalActionType;
  target: ActionTarget;
  label: string;
  explanation: string;
  relatedFlagCodes: ClinicalEvidenceFlag["code"][];
  suggestedSubject?: string;
  suggestedBody?: string;
  suggestedScript?: string;
}

export type CaseReportType =
  | "NON_COMPLIANCE"
  | "RTW_PLAN_FAILURE";

export interface CaseReport {
  id: string;
  caseId: string;
  type: CaseReportType;
  target: ActionTarget;
  title: string;
  summary: string;
  body: string;
  createdAt: string;
  sourceActionIds?: string[];
}
export type EmploymentStatus = "ACTIVE" | "SUSPENDED" | "TERMINATION_IN_PROGRESS" | "TERMINATED";
export type TerminationReason = "INCAPACITY" | "OTHER";
export type TerminationAuditFlag = "OK" | "HIGH_RISK" | null;
export type TerminationStatus =
  | "NOT_STARTED"
  | "PREP_EVIDENCE"
  | "AGENT_MEETING"
  | "CONSULTANT_CONFIRMATION"
  | "PRE_TERMINATION_INVITE_SENT"
  | "PRE_TERMINATION_MEETING_COMPLETED"
  | "DECISION_PENDING"
  | "TERMINATED"
  | "TERMINATION_ABORTED";
export type PayStatusDuringStandDown = "NORMAL" | "WORKCOVER_ONLY" | "SPECIAL_PAID_LEAVE";
export type TerminationDecision = "NO_DECISION" | "TERMINATE" | "DEFER" | "ALTERNATIVE_ROLE_FOUND";

export interface CaseCompliance {
  indicator: ComplianceIndicator;
  reason: string;
  source: 'freshdesk' | 'claude' | 'manual';
  lastChecked: string;
}

export interface MedicalCertificate {
  id: string;
  caseId: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  capacity: WorkCapacity;
  notes?: string;
  source: "freshdesk" | "manual";
  documentUrl?: string;
  sourceReference?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalCertificateInput {
  caseId?: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  capacity: WorkCapacity;
  notes?: string;
  source: "freshdesk" | "manual";
  documentUrl?: string;
  sourceReference?: string;
}

// Helper function to check if a company value is valid
export function isValidCompany(company: string | null | undefined): boolean {
  if (!company) return false;
  const normalized = company.trim().toLowerCase();
  return normalized !== "unknown" && normalized !== "unknown company" && normalized !== "";
}

// Check if a case represents a legitimate worker injury case vs generic email
export function isLegitimateCase(workerCase: {
  workerName: string;
  company: string;
  dateOfInjury?: string;
}): boolean {
  // Must have a worker name
  if (!workerCase.workerName || workerCase.workerName.trim() === "") {
    return false;
  }
  
  const normalizedName = workerCase.workerName.trim().toLowerCase();
  const originalName = workerCase.workerName.trim();
  
  // Filter out purely numeric names (e.g., "08250027189", "123456")
  if (/^\d+$/.test(originalName)) {
    return false;
  }
  
  // Filter out names containing brackets (e.g., "Melad [2510092]", "[pay 2025")
  if (originalName.includes('[') || originalName.includes(']')) {
    return false;
  }
  
  // Filter out names that are mostly numbers (e.g., "Melad 08250027189", "pay 2025")
  // A real name shouldn't have long sequences of digits
  if (/\d{7,}/.test(originalName)) {
    return false;
  }
  
  // Filter out generic claim numbers masquerading as names
  if (normalizedName.startsWith("claim ") || /^claim\s*\d+/.test(normalizedName)) {
    return false;
  }
  
  // Filter out single character names or very short placeholder names
  if (normalizedName.length < 2 || normalizedName === "--" || normalizedName === ".." || normalizedName === "..") {
    return false;
  }
  
  // Filter out generic test/placeholder names
  const genericNames = ["test", "testing", "unknown", "n/a", "none", "my certificate"];
  if (genericNames.includes(normalizedName)) {
    return false;
  }
  
  // Filter out names that start with special characters or numbers
  if (/^[^a-z]/i.test(originalName)) {
    return false;
  }
  
  // Must have either a valid company OR a date of injury (some legitimate cases may lack company info)
  const hasValidCompany = isValidCompany(workerCase.company);
  const hasInjuryDate = !!workerCase.dateOfInjury && workerCase.dateOfInjury.trim() !== "";
  
  return hasValidCompany || hasInjuryDate;
}

// Extract surname (last name) from a worker name for sorting
export function getSurname(workerName: string): string {
  if (!workerName || workerName.trim() === "") {
    return "";
  }
  
  const parts = workerName.trim().split(/\s+/);
  // Return the last word as the surname
  return parts[parts.length - 1].toLowerCase();
}

export interface CaseAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface CaseDiscussionNote {
  id: string;
  caseId: string;
  workerName: string;
  timestamp: string;
  rawText: string;
  summary: string;
  nextSteps?: string[];
  riskFlags?: string[];
  updatesCompliance: boolean;
  updatesRecoveryTimeline: boolean;
}

export type TranscriptInsightSeverity = "info" | "warning" | "critical";
export type TranscriptInsightArea =
  | "compliance"
  | "recovery"
  | "risk"
  | "returnToWork"
  | "engagement";

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId?: string | null;
  organisationId?: string | null;
  eventType: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface TranscriptInsight {
  id: string;
  caseId: string;
  noteId: string;
  area: TranscriptInsightArea;
  severity: TranscriptInsightSeverity;
  summary: string;
  detail?: string;
  createdAt: string;
}

export interface WorkerCase {
  id: string;
  workerName: string;
  company: string; // Allow any company name from Freshdesk, not just predefined ones
  dateOfInjury: string;
  riskLevel: RiskLevel;
  workStatus: WorkStatus;
  hasCertificate: boolean;
  certificateUrl?: string;
  complianceIndicator: ComplianceIndicator; // Legacy field - kept for backward compatibility
  compliance?: CaseCompliance; // New structured compliance object
  medicalConstraints?: MedicalConstraints;
  functionalCapacity?: FunctionalCapacity;
  rtwPlanStatus?: RTWPlanStatus;
  complianceStatus?: ComplianceStatus;
  specialistStatus?: SpecialistStatus;
  specialistReportSummary?: SpecialistReportSummary;
  clinicalEvidence?: ClinicalEvidenceEvaluation;
  currentStatus: string;
  nextStep: string;
  owner: string;
  dueDate: string;
  summary: string;
  ticketIds: string[]; // Track all Freshdesk ticket IDs for this worker
  ticketCount: number; // Number of tickets merged into this case
  aiSummary?: string; // Cached AI-generated summary
  aiSummaryGeneratedAt?: string; // When AI summary was last generated
  aiSummaryModel?: string; // AI model used for summary generation
  aiWorkStatusClassification?: string; // AI-classified work status (At work full hours full duties, etc.)
  ticketLastUpdatedAt?: string; // Most recent updated_at from Freshdesk tickets
  attachments?: CaseAttachment[];
  clcLastFollowUp?: string;
  clcNextFollowUp?: string;
  latestCertificate?: MedicalCertificate;
  certificateHistory?: MedicalCertificateInput[];
  latestDiscussionNotes?: CaseDiscussionNote[];
  discussionInsights?: TranscriptInsight[];
  employmentStatus?: EmploymentStatus;
  terminationProcessId?: string | null;
  terminationReason?: TerminationReason | null;
  terminationAuditFlag?: TerminationAuditFlag;
}

export interface TerminationProcess {
  id: string;
  workerCaseId: string;
  status: TerminationStatus;
  preInjuryRole: string | null;
  rtWAttemptsSummary: string | null;
  hasSustainableRole: boolean | null;
  alternativeRolesConsideredSummary: string | null;
  agentMeetingDate: string | null;
  agentMeetingNotesId: string | null;
  consultantInviteDate: string | null;
  consultantAppointmentDate: string | null;
  consultantReportId: string | null;
  longTermRestrictionsSummary: string | null;
  canReturnPreInjuryRole: boolean | null;
  preTerminationInviteSentDate: string | null;
  preTerminationMeetingDate: string | null;
  preTerminationMeetingLocation: string | null;
  workerAllowedRepresentative: boolean | null;
  workerInstructedNotToAttendWork: boolean | null;
  payStatusDuringStandDown: PayStatusDuringStandDown | null;
  preTerminationLetterDocId: string | null;
  preTerminationMeetingHeld: boolean | null;
  preTerminationMeetingNotesId: string | null;
  anyNewMedicalInfoProvided: boolean | null;
  newMedicalDocsSummary: string | null;
  decision: TerminationDecision;
  decisionDate: string | null;
  decisionRationale: string | null;
  terminationEffectiveDate: string | null;
  terminationNoticeWeeks: number | null;
  noticeType: "WORKED" | "PAID_IN_LIEU" | "MIXED" | null;
  terminationLetterDocId: string | null;
  entitlementsSummary: string | null;
  ongoingCompArrangements: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  code: string;
  body: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: string;
  workerCaseId: string;
  templateCode: string | null;
  content: string;
  createdAt: string;
}

// Database tables
export const workerCases = pgTable("worker_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerName: text("worker_name").notNull(),
  company: text("company").notNull(),
  dateOfInjury: timestamp("date_of_injury").notNull(),
  riskLevel: text("risk_level").notNull(),
  workStatus: text("work_status").notNull(),
  hasCertificate: boolean("has_certificate").notNull().default(false),
  certificateUrl: text("certificate_url"),
  complianceIndicator: text("compliance_indicator").notNull(),
  complianceJson: jsonb("compliance_json").$type<CaseCompliance>(),
  clinicalStatusJson: jsonb("clinical_status_json").$type<CaseClinicalStatus | null>(),
  currentStatus: text("current_status").notNull(),
  nextStep: text("next_step").notNull(),
  owner: text("owner").notNull(),
  dueDate: text("due_date").notNull(),
  summary: text("summary").notNull(),
  ticketIds: text("ticket_ids").array().notNull().default(sql`ARRAY[]::text[]`),
  ticketCount: text("ticket_count").notNull().default('1'),
  aiSummary: text("ai_summary"),
  aiSummaryGeneratedAt: timestamp("ai_summary_generated_at"),
  aiSummaryModel: text("ai_summary_model"),
  aiWorkStatusClassification: text("ai_work_status_classification"),
  ticketLastUpdatedAt: timestamp("ticket_last_updated_at"),
  clcLastFollowUp: text("clc_last_follow_up"),
  clcNextFollowUp: text("clc_next_follow_up"),
  employmentStatus: text("employment_status").notNull().default("ACTIVE"),
  terminationProcessId: varchar("termination_process_id"),
  terminationReason: text("termination_reason"),
  terminationAuditFlag: text("termination_audit_flag"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const terminationProcesses = pgTable("termination_processes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerCaseId: varchar("worker_case_id")
    .notNull()
    .references(() => workerCases.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("NOT_STARTED"),
  preInjuryRole: text("pre_injury_role"),
  rtWAttemptsSummary: text("rtw_attempts_summary"),
  hasSustainableRole: boolean("has_sustainable_role"),
  alternativeRolesConsideredSummary: text("alternative_roles_considered_summary"),
  agentMeetingDate: timestamp("agent_meeting_date"),
  agentMeetingNotesId: text("agent_meeting_notes_id"),
  consultantInviteDate: timestamp("consultant_invite_date"),
  consultantAppointmentDate: timestamp("consultant_appointment_date"),
  consultantReportId: text("consultant_report_id"),
  longTermRestrictionsSummary: text("long_term_restrictions_summary"),
  canReturnPreInjuryRole: boolean("can_return_pre_injury_role"),
  preTerminationInviteSentDate: timestamp("pre_termination_invite_sent_date"),
  preTerminationMeetingDate: timestamp("pre_termination_meeting_date"),
  preTerminationMeetingLocation: text("pre_termination_meeting_location"),
  workerAllowedRepresentative: boolean("worker_allowed_representative"),
  workerInstructedNotToAttendWork: boolean("worker_instructed_not_to_attend_work"),
  payStatusDuringStandDown: text("pay_status_during_stand_down"),
  preTerminationLetterDocId: text("pre_termination_letter_doc_id"),
  preTerminationMeetingHeld: boolean("pre_termination_meeting_held"),
  preTerminationMeetingNotesId: text("pre_termination_meeting_notes_id"),
  anyNewMedicalInfoProvided: boolean("any_new_medical_info_provided"),
  newMedicalDocsSummary: text("new_medical_docs_summary"),
  decision: text("decision").notNull().default("NO_DECISION"),
  decisionDate: timestamp("decision_date"),
  decisionRationale: text("decision_rationale"),
  terminationEffectiveDate: timestamp("termination_effective_date"),
  terminationNoticeWeeks: integer("termination_notice_weeks"),
  noticeType: text("notice_type"),
  terminationLetterDocId: text("termination_letter_doc_id"),
  entitlementsSummary: text("entitlements_summary"),
  ongoingCompArrangements: text("ongoing_comp_arrangements"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedDocuments = pgTable("generated_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerCaseId: varchar("worker_case_id")
    .references(() => workerCases.id, { onDelete: "cascade" }),
  templateCode: text("template_code"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicalCertificates = pgTable("medical_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => workerCases.id),
  issueDate: timestamp("issue_date").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  capacity: text("capacity").notNull(),
  notes: text("notes"),
  source: text("source").notNull().default("freshdesk"),
  documentUrl: text("document_url"),
  sourceReference: text("source_reference"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caseAttachments = pgTable("case_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => workerCases.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseDiscussionNotes = pgTable("case_discussion_notes", {
  id: text("id").primaryKey(),
  caseId: text("case_id").references(() => workerCases.id).notNull(),
  workerName: text("worker_name").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  rawText: text("raw_text").notNull(),
  summary: text("summary").notNull(),
  nextSteps: json("next_steps").$type<string[]>(),
  riskFlags: json("risk_flags").$type<string[]>(),
  updatesCompliance: boolean("updates_compliance").default(false),
  updatesRecoveryTimeline: boolean("updates_recovery_timeline").default(false),
});

export const caseDiscussionInsights = pgTable("case_discussion_insights", {
  id: text("id").primaryKey(),
  caseId: text("case_id").references(() => workerCases.id).notNull(),
  noteId: text("note_id").references(() => caseDiscussionNotes.id).notNull(),
  area: text("area").notNull(),
  severity: text("severity").notNull(),
  summary: text("summary").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userId: varchar("user_id"),
  organisationId: varchar("organisation_id"),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type"),
  resourceId: varchar("resource_id"),
  metadata: jsonb("metadata"),
});

// Authentication Types
export type UserRole = "admin" | "employer" | "clinician" | "insurer";

export interface User {
  id: string;
  email: string;
  password: string; // This will be hashed
  role: UserRole;
  subrole: string | null;
  companyId: string | null;
  insurerId: string | null;
  isActive: boolean;
  createdAt: Date;
}

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // bcrypt hashed
  role: text("role").notNull(), // admin | employer | clinician | insurer
  subrole: text("subrole"), // e.g., "doctor", "physio"
  companyId: varchar("company_id"), // UUID reference to company
  insurerId: varchar("insurer_id"), // UUID reference to insurer
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkerCaseSchema = createInsertSchema(workerCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseAttachmentSchema = createInsertSchema(caseAttachments).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkerCase = z.infer<typeof insertWorkerCaseSchema>;
export type WorkerCaseDB = typeof workerCases.$inferSelect;
export type InsertCaseAttachment = z.infer<typeof insertCaseAttachmentSchema>;
export type CaseAttachmentDB = typeof caseAttachments.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserDB = typeof users.$inferSelect;
export type MedicalCertificateDB = typeof medicalCertificates.$inferSelect;
export type InsertMedicalCertificate = typeof medicalCertificates.$inferInsert;
export type CaseDiscussionNoteDB = typeof caseDiscussionNotes.$inferSelect;
export type InsertCaseDiscussionNote = typeof caseDiscussionNotes.$inferInsert;
export type CaseDiscussionInsightDB = typeof caseDiscussionInsights.$inferSelect;
export type InsertCaseDiscussionInsight = typeof caseDiscussionInsights.$inferInsert;
export type TerminationProcessDB = typeof terminationProcesses.$inferSelect;
export type InsertTerminationProcess = typeof terminationProcesses.$inferInsert;
export type DocumentTemplateDB = typeof documentTemplates.$inferSelect;
export type GeneratedDocumentDB = typeof generatedDocuments.$inferSelect;

export interface RecoveryTimelineSummary {
  totalCertificates: number;
  daysOnReducedCapacity: number;
  lastKnownCapacity: WorkCapacity;
  lastUpdated?: string | null;
}

export interface RecoveryTimelineResponse {
  certificates: MedicalCertificate[];
  summary: RecoveryTimelineSummary;
}

export type TimelineEventType =
  | "certificate_added"
  | "discussion_note"
  | "attachment_uploaded"
  | "termination_milestone"
  | "case_status_change"
  | "case_created";

export interface TimelineEvent {
  id: string;
  caseId: string;
  eventType: TimelineEventType;
  timestamp: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  sourceId?: string;
  sourceTable?: string;
  icon?: string;
  severity?: "info" | "warning" | "critical";
}

export interface TimelineResponse {
  caseId: string;
  events: TimelineEvent[];
  totalEvents: number;
}

// Avatar Pipeline Types
export type AvatarPipelineType = "a2f_flame" | "liveportrait_mediapipe";

export type FallbackConditionType =
  | "a2f_sdk_unavailable"
  | "flame_unavailable"
  | "vram_low"
  | "high_load"
  | "render_failure";

export interface A2FSdkUnavailableCondition {
  type: "a2f_sdk_unavailable";
  timeout_ms: number;
}

export interface FlameUnavailableCondition {
  type: "flame_unavailable";
  timeout_ms: number;
}

export interface VramLowCondition {
  type: "vram_low";
  threshold_gb: number;
}

export interface HighLoadCondition {
  type: "high_load";
  concurrent_sessions: number;
}

export interface RenderFailureCondition {
  type: "render_failure";
  consecutive_failures: number;
}

export type FallbackCondition =
  | A2FSdkUnavailableCondition
  | FlameUnavailableCondition
  | VramLowCondition
  | HighLoadCondition
  | RenderFailureCondition;

export interface AvatarPipelineConfig {
  fallback_conditions: FallbackCondition[];
  fallback_pipeline: AvatarPipelineType;
}

export interface AvatarPipelineStatus {
  active_pipeline: AvatarPipelineType;
  is_fallback: boolean;
  triggered_condition: FallbackConditionType | null;
  a2f_sdk_available: boolean;
  flame_available: boolean;
  vram_gb: number;
  concurrent_sessions: number;
  consecutive_render_failures: number;
  last_checked: string;
}

export interface AvatarRenderSession {
  id: string;
  pipeline: AvatarPipelineType;
  started_at: string;
  last_activity: string;
}
