import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, jsonb, integer, numeric } from "drizzle-orm/pg-core";
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
    | "NOT_IMPROVING_AGAINST_EXPECTED_TIMELINE"
    | "SPECIALIST_REFERRED_NO_APPOINTMENT"
    | "SPECIALIST_APPOINTMENT_OVERDUE"
    | "SPECIALIST_SEEN_NO_REPORT"
    | "SPECIALIST_REPORT_OUTDATED"
    | "RTW_PLAN_FAILING"
    | "WORKER_NON_COMPLIANT"
    | "EVIDENCE_INCOMPLETE"
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

// Certificate Engine v1 - Additional types
export type CertificateType = "medical_certificate" | "clearance" | "fitness_assessment" | "other";
export type CertificateCapacity = "fit" | "partial" | "unfit" | "unknown";
export type PractitionerType = "gp" | "specialist" | "physiotherapist" | "psychologist" | "other";
export type AlertType = "expiring_soon" | "expired" | "review_needed";

export interface RestrictionItem {
  type: "modified_duties" | "no_lifting" | "reduced_hours" | "work_from_home" | "other";
  description: string;
  startDate?: string;
  endDate?: string;
}

export interface OcrExtractedData {
  rawText: string;
  extractedFields: {
    issueDate?: string;
    startDate?: string;
    endDate?: string;
    practitionerName?: string;
    capacity?: string;
    restrictions?: string[];
  };
  confidence: {
    overall: number;
    fields: Record<string, number>;
  };
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
  organizationId: string; // Organization/tenant isolation - added in migration 0003
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
  organizationId: varchar("organization_id").notNull(), // Added in migration 0003 - tenant isolation
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
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
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

  // Certificate Engine v1 - Extended fields
  certificateType: text("certificate_type").notNull().default("medical_certificate"),
  organizationId: varchar("organization_id"),
  workerId: varchar("worker_id"),
  documentId: varchar("document_id"),
  restrictions: jsonb("restrictions").default(sql`'[]'::jsonb`).$type<RestrictionItem[]>(),
  treatingPractitioner: varchar("treating_practitioner"),
  practitionerType: varchar("practitioner_type"),
  clinicName: varchar("clinic_name"),
  rawExtractedData: jsonb("raw_extracted_data").$type<OcrExtractedData>(),
  extractionConfidence: numeric("extraction_confidence", { precision: 3, scale: 2 }),
  requiresReview: boolean("requires_review").default(false),
  isCurrentCertificate: boolean("is_current_certificate").default(false),
  reviewDate: timestamp("review_date"),
  fileName: varchar("file_name"),
  fileUrl: varchar("file_url"),
});

export const caseAttachments = pgTable("case_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
  caseId: varchar("case_id").notNull().references(() => workerCases.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caseDiscussionNotes = pgTable("case_discussion_notes", {
  id: text("id").primaryKey(),
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
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

export const certificateExpiryAlerts = pgTable("certificate_expiry_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  certificateId: varchar("certificate_id").notNull().references(() => medicalCertificates.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // 'expiring_soon' | 'expired' | 'review_needed'
  alertDate: timestamp("alert_date").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Authentication Types
export type UserRole = "admin" | "employer" | "clinician" | "insurer";

export interface User {
  id: string;
  email: string;
  password: string; // This will be hashed
  role: UserRole;
  subrole: string | null;
  organizationId: string; // Organization/tenant isolation
  companyId: string | null; // Deprecated - use organizationId
  insurerId: string | null;
  isActive: boolean;
  createdAt: Date;
}

// Users table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(), // Note: Unique constraint is (email, organization_id) - see migration 0003
  password: text("password").notNull(), // bcrypt hashed
  role: text("role").notNull(), // admin | employer | clinician | insurer
  subrole: text("subrole"), // e.g., "doctor", "physio"
  organizationId: varchar("organization_id").notNull(), // Added in migration 0003
  companyId: varchar("company_id"), // Deprecated - use organizationId
  insurerId: varchar("insurer_id"), // UUID reference to insurer
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User invites table for secure registration
export const userInvites = pgTable("user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  organizationId: varchar("organization_id").notNull(),
  role: text("role").notNull(), // admin | employer | clinician | insurer
  subrole: text("subrole"), // e.g., "doctor", "physio"
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  status: text("status").notNull().default("pending"), // pending | used | expired | cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Webhook form mappings for secure webhook authentication
export const webhookFormMappings = pgTable("webhook_form_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: text("form_id").notNull().unique(), // JotForm form ID
  organizationId: varchar("organization_id").notNull(),
  formType: text("form_type").notNull(), // "worker_injury", "medical_certificate", etc.
  webhookPassword: text("webhook_password").notNull(), // Secure password for webhook verification
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertUserInviteSchema = createInsertSchema(userInvites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWebhookFormMappingSchema = createInsertSchema(webhookFormMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkerCase = z.infer<typeof insertWorkerCaseSchema>;
export type WorkerCaseDB = typeof workerCases.$inferSelect;
export type InsertCaseAttachment = z.infer<typeof insertCaseAttachmentSchema>;
export type CaseAttachmentDB = typeof caseAttachments.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserDB = typeof users.$inferSelect;
export type InsertUserInvite = z.infer<typeof insertUserInviteSchema>;
export type UserInviteDB = typeof userInvites.$inferSelect;
export type InsertWebhookFormMapping = z.infer<typeof insertWebhookFormMappingSchema>;
export type WebhookFormMappingDB = typeof webhookFormMappings.$inferSelect;
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
export type CertificateExpiryAlertDB = typeof certificateExpiryAlerts.$inferSelect;
export type InsertCertificateExpiryAlert = typeof certificateExpiryAlerts.$inferInsert;

// Zod schemas for Certificate Engine v1
export const insertMedicalCertificateSchema = createInsertSchema(medicalCertificates);
export const selectMedicalCertificateSchema = createInsertSchema(medicalCertificates);
export const insertCertificateExpiryAlertSchema = createInsertSchema(certificateExpiryAlerts);
export const selectCertificateExpiryAlertSchema = createInsertSchema(certificateExpiryAlerts);

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

// =====================================================
// Action Queue v1 - Case Actions for Compliance
// =====================================================

export type CaseActionType = "chase_certificate" | "review_case" | "follow_up";
export type CaseActionStatus = "pending" | "done" | "cancelled";

export interface CaseAction {
  id: string;
  organizationId: string; // Tenant isolation
  caseId: string;
  type: CaseActionType;
  status: CaseActionStatus;
  dueDate?: string;
  priority: number;
  notes?: string;
  workerName?: string; // Denormalized for display
  company?: string; // Denormalized for display
  createdAt: string;
  updatedAt: string;
}

export const caseActions = pgTable("case_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
  caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // chase_certificate, review_case, follow_up
  status: text("status").notNull().default("pending"), // pending, done, cancelled
  dueDate: timestamp("due_date"),
  priority: integer("priority").default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCaseActionSchema = createInsertSchema(caseActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCaseAction = typeof caseActions.$inferInsert;
export type CaseActionDB = typeof caseActions.$inferSelect;

// =====================================================
// Certificate Compliance Engine v1
// =====================================================

export type CertificateComplianceFlag =
  | "no_certificate"
  | "certificate_expiring_soon"
  | "certificate_expired"
  | "compliant";

export interface CertificateCompliance {
  status: CertificateComplianceFlag;
  activeCertificate?: MedicalCertificate;
  newestCertificate?: MedicalCertificate;
  daysUntilExpiry?: number;
  daysSinceExpiry?: number;
  message: string;
}

// =====================================================
// Smart Summary Engine v1 - Structured Case Analysis
// =====================================================

export type SummaryRiskLevel = "high" | "medium" | "low";
export type ImportanceLevel = "critical" | "recommended";
export type PriorityLevel = "urgent" | "normal";
export type RTWReadinessLevel = "ready" | "conditional" | "not_ready" | "unknown";
export type ComplianceStatusLevel = "compliant" | "at_risk" | "non_compliant";

export interface SummaryRisk {
  level: SummaryRiskLevel;
  description: string;
  source: string;
}

export interface MissingInfoItem {
  item: string;
  importance: ImportanceLevel;
}

export interface RecommendedAction {
  action: string;
  priority: PriorityLevel;
  reason: string;
}

export interface RTWReadiness {
  level: RTWReadinessLevel;
  conditions: string[];
  blockers: string[];
}

export interface ComplianceSummary {
  status: ComplianceStatusLevel;
  issues: string[];
}

export interface CaseSummary {
  caseId: string;
  generatedAt: string;

  // Narrative
  summaryText: string;
  currentStatus: string;

  // Structured data
  risks: SummaryRisk[];
  missingInfo: MissingInfoItem[];
  recommendedActions: RecommendedAction[];
  rtwReadiness: RTWReadiness;
  compliance: ComplianceSummary;

  confidence: number;
}

// =====================================================
// IR Email Drafter v1 - AI-Powered Email Generation
// =====================================================

export type EmailDraftType =
  | "initial_contact"
  | "certificate_chase"
  | "check_in_follow_up"
  | "rtw_update"
  | "duties_proposal"
  | "non_compliance_warning"
  | "employer_update"
  | "insurer_report"
  | "general_response";

export type EmailRecipientType = "worker" | "employer" | "insurer" | "host" | "other";
export type EmailTone = "formal" | "supportive" | "firm";
export type EmailDraftStatus = "draft" | "sent" | "discarded";

export const emailDrafts = pgTable("email_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
  caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),
  emailType: text("email_type").notNull(),
  recipient: text("recipient").notNull(),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  tone: text("tone").notNull().default("formal"),
  additionalContext: text("additional_context"),
  caseContextSnapshot: jsonb("case_context_snapshot"),
  status: text("status").notNull().default("draft"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertEmailDraft = typeof emailDrafts.$inferInsert;
export type EmailDraftDB = typeof emailDrafts.$inferSelect;

export interface EmailDraft {
  id: string;
  caseId: string;
  emailType: EmailDraftType;
  recipient: EmailRecipientType;
  recipientName: string | null;
  recipientEmail: string | null;
  subject: string;
  body: string;
  tone: EmailTone;
  additionalContext: string | null;
  status: EmailDraftStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailDraftRequest {
  emailType: EmailDraftType;
  recipient: EmailRecipientType;
  recipientName?: string;
  recipientEmail?: string;
  additionalContext?: string;
  tone?: EmailTone;
}

export interface EmailTypeInfo {
  value: EmailDraftType;
  label: string;
  description: string;
  defaultRecipient: EmailRecipientType;
}

// =====================================================
// Email Notifications Engine v1 - Automated Alerts
// =====================================================

export type NotificationType =
  | "certificate_expiring"
  | "certificate_expired"
  | "action_overdue"
  | "case_attention_needed"
  | "weekly_digest";

export type NotificationPriority = "low" | "medium" | "high" | "critical";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(), // Added in migration 0009 - tenant isolation
  type: text("type").notNull(),
  priority: text("priority").notNull().default("medium"),
  caseId: varchar("case_id").references(() => workerCases.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id"),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  dedupeKey: text("dedupe_key").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertNotification = typeof notifications.$inferInsert;
export type NotificationDB = typeof notifications.$inferSelect;

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  caseId: string | null;
  recipientId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: string | null;
  failureReason: string | null;
  dedupeKey: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ============================================
// INSURERS TABLE
// ============================================
export const insurers = pgTable("insurers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInsurerSchema = createInsertSchema(insurers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Insurer = typeof insurers.$inferSelect;
export type InsertInsurer = z.infer<typeof insertInsurerSchema>;

// ============================================
// ORGANIZATIONS TABLE
// ============================================
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  logoUrl: text("logo_url"),
  contactName: text("contact_name"),
  contactPhone: varchar("contact_phone", { length: 50 }),
  contactEmail: text("contact_email"),
  insurerId: varchar("insurer_id").references(() => insurers.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

// =====================================================
// Weekly Check-ins Engine v1 - Worker Welfare Monitoring
// =====================================================

// Case types for check-in context
export type CheckInCaseType = "physio" | "mental_health" | "msk" | "general";
export type RTWStage = "not_started" | "early" | "mid" | "near_completion" | "completed";
export type CurrentDuties = "not_working" | "modified" | "full";
export type CertificateStatus = "valid" | "expiring_soon" | "expired" | "none";
export type TrendDirection = "improving" | "stable" | "declining" | "unknown";

// Check-in delivery and interaction
export type DeliveryChannel = "email" | "sms" | "zoom" | "voice";
export type InteractionMode = "form" | "voice" | "avatar";
export type CheckInStatus = "pending" | "scheduled" | "sent" | "reminded" | "in_progress" | "completed" | "expired" | "missed";

// Conversation node types
export type ConversationNodeType = "statement" | "question" | "conditional";
export type ResponseType = "scale" | "choice" | "yes_no" | "free_text" | "number" | "none";
export type ConditionOperator = "lt" | "gt" | "eq" | "lte" | "gte" | "contains";

export interface ConversationNodeCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface ConversationNodeBranch {
  condition: string;
  nextNodeId: string;
}

export interface ConversationNode {
  id: string;
  type: ConversationNodeType;
  prompt: string;
  responseType: ResponseType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  extractAs?: string; // e.g., "painScore", "moodScore"
  showWhen?: ConversationNodeCondition[];
  branches?: ConversationNodeBranch[];
  defaultNextNodeId?: string;
}

export interface CaseContext {
  caseId: string;
  caseType: CheckInCaseType;
  rtwStage: RTWStage;
  currentDuties: CurrentDuties;
  certificateStatus: CertificateStatus;
  certificateExpiresInDays?: number;
  certificateExpiryDate?: string;
  lastCheckIn?: {
    painScore?: number;
    moodScore?: number;
    exerciseCompliance?: number;
    date: string;
  };
  trend: TrendDirection;
  openActions: string[];
  workerName: string;
}

// Escalation trigger types
export type EscalationSeverity = "high" | "medium" | "low";
export type EscalationReason =
  | "pain_spike"
  | "severe_pain"
  | "mood_crash"
  | "declining_trend"
  | "low_compliance"
  | "concerning_language"
  | "disengagement"
  | "certificate_not_booked";

export interface EscalationTrigger {
  reason: EscalationReason;
  severity: EscalationSeverity;
  message: string;
  details?: string;
}

// Conversation scripts table
export const conversationScripts = pgTable("conversation_scripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  caseType: varchar("case_type", { length: 50 }), // null = all case types
  nodes: jsonb("nodes").notNull().$type<ConversationNode[]>(),
  startNodeId: varchar("start_node_id", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false), // true for built-in templates
  organizationId: varchar("organization_id"), // null = system-wide default
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Check-ins table
export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id"), // Denormalized for lookup
  scriptId: varchar("script_id").references(() => conversationScripts.id),

  // Access token for unauthenticated form access
  token: varchar("token", { length: 64 }).notNull().unique(),

  // Delivery configuration
  deliveryChannel: varchar("delivery_channel", { length: 20 }).notNull().default("email"),
  interactionMode: varchar("interaction_mode", { length: 20 }).notNull().default("form"),

  // Scheduling
  scheduledFor: timestamp("scheduled_for").notNull(),
  expiresAt: timestamp("expires_at"),

  // Zoom integration (V2)
  zoomMeetingId: varchar("zoom_meeting_id", { length: 255 }),
  zoomJoinUrl: varchar("zoom_join_url", { length: 500 }),

  // Status tracking
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  reminderSentAt: timestamp("reminder_sent_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  // Context snapshot at time of generation
  contextSnapshot: jsonb("context_snapshot").$type<CaseContext>(),

  organizationId: varchar("organization_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Check-in transcripts (responses)
export const checkInTranscripts = pgTable("check_in_transcripts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  checkInId: varchar("check_in_id").notNull().references(() => checkIns.id, { onDelete: "cascade" }),

  // The conversation
  scriptUsed: jsonb("script_used").$type<ConversationNode[]>(),
  responses: jsonb("responses").$type<Record<string, string | number | boolean>>(),
  fullTranscript: text("full_transcript"), // Human-readable, especially for voice/avatar

  // Extracted metrics for trend analysis
  painScore: integer("pain_score"),
  moodScore: integer("mood_score"),
  exerciseCompliance: integer("exercise_compliance"), // days 0-7
  dutyFeedback: varchar("duty_feedback", { length: 50 }),
  certificateBooked: boolean("certificate_booked"),

  // Analysis
  escalationTriggered: boolean("escalation_triggered").default(false),
  escalationReasons: jsonb("escalation_reasons").$type<EscalationTrigger[]>(),
  sentiment: varchar("sentiment", { length: 20 }), // positive, neutral, negative, concerning

  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Worker check-in preferences
export const workerCheckInPreferences = pgTable("worker_check_in_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull(),
  caseId: varchar("case_id").references(() => workerCases.id, { onDelete: "cascade" }),

  preferredChannel: varchar("preferred_channel", { length: 20 }).default("email"),
  preferredMode: varchar("preferred_mode", { length: 20 }).default("form"),
  preferredDay: varchar("preferred_day", { length: 10 }), // monday, tuesday, etc
  preferredTime: varchar("preferred_time", { length: 5 }), // HH:MM
  timezone: varchar("timezone", { length: 50 }).default("Australia/Melbourne"),
  language: varchar("language", { length: 10 }).default("en"),
  accessibilityNeeds: jsonb("accessibility_needs").$type<string[]>(),

  // Contact info
  phoneNumber: varchar("phone_number", { length: 20 }),
  email: varchar("email", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message send log (for billing and tracking)
export const messageSendLog = pgTable("message_send_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull(),
  checkInId: varchar("check_in_id").references(() => checkIns.id, { onDelete: "set null" }),

  // Message details
  channel: varchar("channel", { length: 20 }).notNull(), // sms, email, voice, zoom
  provider: varchar("provider", { length: 50 }), // twilio, vonage, plivo
  recipient: varchar("recipient", { length: 255 }).notNull(),
  messageType: varchar("message_type", { length: 50 }), // check_in_link, reminder, etc

  // Status
  status: varchar("status", { length: 50 }).notNull(), // pending, sent, delivered, failed
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  failureReason: text("failure_reason"),

  // Billing
  costCents: integer("cost_cents"),
  billedCents: integer("billed_cents"),

  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

// Check-in insights (computed after each check-in)
export const checkInInsights = pgTable("check_in_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => workerCases.id, { onDelete: "cascade" }),
  checkInId: varchar("check_in_id").notNull().references(() => checkIns.id, { onDelete: "cascade" }),

  // Trend analysis
  painTrend: varchar("pain_trend", { length: 20 }),
  moodTrend: varchar("mood_trend", { length: 20 }),
  complianceTrend: varchar("compliance_trend", { length: 20 }),

  // Computed recommendations
  recommendations: jsonb("recommendations").$type<string[]>(),

  // Risk scoring
  riskScore: integer("risk_score"), // 0-100
  riskFactors: jsonb("risk_factors").$type<string[]>(),

  // Feed into smart summary
  summaryContext: text("summary_context"),

  computedAt: timestamp("computed_at").defaultNow(),
});

// Insert schemas
export const insertConversationScriptSchema = createInsertSchema(conversationScripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCheckInTranscriptSchema = createInsertSchema(checkInTranscripts).omit({
  id: true,
  submittedAt: true,
});

export const insertWorkerCheckInPreferencesSchema = createInsertSchema(workerCheckInPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSendLogSchema = createInsertSchema(messageSendLog).omit({
  id: true,
  sentAt: true,
});

export const insertCheckInInsightsSchema = createInsertSchema(checkInInsights).omit({
  id: true,
  computedAt: true,
});

// Types
export type ConversationScriptDB = typeof conversationScripts.$inferSelect;
export type InsertConversationScript = z.infer<typeof insertConversationScriptSchema>;
export type CheckInDB = typeof checkIns.$inferSelect;
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckInTranscriptDB = typeof checkInTranscripts.$inferSelect;
export type InsertCheckInTranscript = z.infer<typeof insertCheckInTranscriptSchema>;
export type WorkerCheckInPreferencesDB = typeof workerCheckInPreferences.$inferSelect;
export type InsertWorkerCheckInPreferences = z.infer<typeof insertWorkerCheckInPreferencesSchema>;
export type MessageSendLogDB = typeof messageSendLog.$inferSelect;
export type InsertMessageSendLog = z.infer<typeof insertMessageSendLogSchema>;
export type CheckInInsightsDB = typeof checkInInsights.$inferSelect;
export type InsertCheckInInsights = z.infer<typeof insertCheckInInsightsSchema>;
