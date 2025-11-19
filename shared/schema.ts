import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// GPNet2 Dashboard Types
export type CompanyName = "Symmetry" | "Allied Health" | "Apex Labour" | "SafeWorks" | "Core Industrial";
export type WorkStatus = "At work" | "Off work";
export type RiskLevel = "High" | "Medium" | "Low";
export type ComplianceIndicator = "Very High" | "High" | "Medium" | "Low" | "Very Low";
export type WorkCapacity = "fit" | "partial" | "unfit" | "unknown";

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
