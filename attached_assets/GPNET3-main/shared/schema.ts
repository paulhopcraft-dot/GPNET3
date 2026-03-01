import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// GPNet2 Dashboard Types
export type CompanyName = "Symmetry" | "Allied Health" | "Apex Labour" | "SafeWorks" | "Core Industrial";
export type WorkStatus = "At work" | "Off work";
export type RiskLevel = "High" | "Medium" | "Low";
export type ComplianceIndicator = "Very High" | "High" | "Medium" | "Low" | "Very Low";

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
