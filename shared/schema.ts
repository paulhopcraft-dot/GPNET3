import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
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
  company: CompanyName;
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

export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  workerName: text("worker_name").notNull(),
  injuryDate: timestamp("injury_date").notNull(),
  latestCertificate: text("latest_certificate").notNull(),
  status: text("status").notNull(),
  riskLevel: text("risk_level").notNull(),
  notes: text("notes"),
});

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: varchar("case_id").notNull().references(() => cases.id),
  type: text("type").notNull(),
  expiry: timestamp("expiry").notNull(),
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
});

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;
