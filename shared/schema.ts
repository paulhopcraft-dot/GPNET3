import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// GPNet2 Dashboard Types
export type CompanyName = "Symmetry" | "Allied Health" | "Apex Labour" | "SafeWorks" | "Core Industrial";
export type WorkStatus = "At work" | "Off work";
export type RiskLevel = "High" | "Medium" | "Low";
export type ComplianceIndicator = "Very High" | "High" | "Medium" | "Low" | "Very Low";

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

export interface WorkerCase {
  id: string;
  workerName: string;
  company: string; // Allow any company name from Freshdesk, not just predefined ones
  dateOfInjury: string;
  riskLevel: RiskLevel;
  workStatus: WorkStatus;
  hasCertificate: boolean;
  certificateUrl?: string;
  complianceIndicator: ComplianceIndicator;
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

export const caseAttachments = pgTable("case_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => workerCases.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

export type InsertWorkerCase = z.infer<typeof insertWorkerCaseSchema>;
export type WorkerCaseDB = typeof workerCases.$inferSelect;
export type InsertCaseAttachment = z.infer<typeof insertCaseAttachmentSchema>;
export type CaseAttachmentDB = typeof caseAttachments.$inferSelect;
