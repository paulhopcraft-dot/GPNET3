import type { WorkerCase, WorkerCaseDB } from "@shared/schema";
import { db } from "./db";
import { workerCases, caseAttachments, isLegitimateCase } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
  getGPNet2CaseById(id: string): Promise<WorkerCase | null>;
  syncWorkerCaseFromFreshdesk(caseData: Partial<WorkerCase>): Promise<void>;
  clearAllWorkerCases(): Promise<void>;
  updateAISummary(caseId: string, summary: string, model: string, workStatusClassification?: string): Promise<void>;
  needsSummaryRefresh(caseId: string): Promise<boolean>;
}

class DbStorage implements IStorage {
  async getGPNet2Cases(): Promise<WorkerCase[]> {
    const dbCases = await db.select().from(workerCases);
    
    const casesWithAttachments = await Promise.all(
      dbCases.map(async (dbCase: WorkerCaseDB) => {
        const attachments = await db
          .select()
          .from(caseAttachments)
          .where(eq(caseAttachments.caseId, dbCase.id));

        return {
          id: dbCase.id,
          workerName: dbCase.workerName,
          company: dbCase.company as any,
          dateOfInjury: dbCase.dateOfInjury.toISOString().split('T')[0],
          riskLevel: dbCase.riskLevel as any,
          workStatus: dbCase.workStatus as any,
          hasCertificate: dbCase.hasCertificate,
          certificateUrl: dbCase.certificateUrl || undefined,
          complianceIndicator: dbCase.complianceIndicator as any,
          compliance: dbCase.complianceJson as any, // Parse JSONB compliance object
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
          attachments: attachments.map((att) => ({
            id: att.id,
            name: att.name,
            type: att.type,
            url: att.url,
          })),
        };
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

    const workerCase = dbCase[0];
    return {
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
      attachments: attachments.map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        url: att.url,
      })),
    };
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

    const dbData = {
      id: caseData.id,
      workerName: caseData.workerName || "Unknown",
      company: caseData.company || "Unknown",
      dateOfInjury,
      riskLevel: caseData.riskLevel || "Low",
      workStatus: caseData.workStatus || "Off work",
      hasCertificate: caseData.hasCertificate || false,
      certificateUrl: caseData.certificateUrl || null,
      complianceIndicator: caseData.complianceIndicator || "Low",
      complianceJson: caseData.compliance || null, // Store full compliance object as JSONB
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
        })
        .where(eq(workerCases.id, caseData.id));
    } else {
      await db.insert(workerCases).values(dbData);
    }
  }

  async clearAllWorkerCases(): Promise<void> {
    await db.delete(caseAttachments);
    await db.delete(workerCases);
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
}

export const storage: IStorage = new DbStorage();
