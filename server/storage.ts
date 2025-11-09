import type { WorkerCase, WorkerCaseDB } from "@shared/schema";
import { db } from "./db";
import { workerCases, caseAttachments } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
  getGPNet2CaseById(id: string): Promise<WorkerCase | null>;
  syncWorkerCaseFromFreshdesk(caseData: Partial<WorkerCase>): Promise<void>;
  clearAllWorkerCases(): Promise<void>;
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
          currentStatus: dbCase.currentStatus,
          nextStep: dbCase.nextStep,
          owner: dbCase.owner,
          dueDate: dbCase.dueDate,
          summary: dbCase.summary,
          ticketIds: dbCase.ticketIds || [dbCase.id],
          ticketCount: Number(dbCase.ticketCount) || 1,
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
      currentStatus: workerCase.currentStatus,
      nextStep: workerCase.nextStep,
      owner: workerCase.owner,
      dueDate: workerCase.dueDate,
      summary: workerCase.summary,
      ticketIds: workerCase.ticketIds || [workerCase.id],
      ticketCount: Number(workerCase.ticketCount) || 1,
      clcLastFollowUp: workerCase.clcLastFollowUp || undefined,
      clcNextFollowUp: workerCase.clcNextFollowUp || undefined,
      injuryType: workerCase.injuryType || undefined,
      expectedRecoveryDate: workerCase.expectedRecoveryDate || undefined,
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

    const existingCase = await db
      .select()
      .from(workerCases)
      .where(eq(workerCases.id, caseData.id))
      .limit(1);

    const dateOfInjury = caseData.dateOfInjury 
      ? (typeof caseData.dateOfInjury === 'string' ? new Date(caseData.dateOfInjury) : caseData.dateOfInjury)
      : new Date();

    const dbData = {
      id: caseData.id,
      workerName: caseData.workerName || "Unknown",
      company: caseData.company || "Unknown",
      dateOfInjury,
      riskLevel: caseData.riskLevel || "Low",
      workStatus: caseData.workStatus || "Off work",
      hasCertificate: caseData.hasCertificate || false,
      certificateUrl: caseData.certificateUrl || null,
      complianceIndicator: caseData.complianceIndicator || "On track",
      currentStatus: caseData.currentStatus || "New case",
      nextStep: caseData.nextStep || "Review",
      owner: caseData.owner || "CLC Team",
      dueDate: caseData.dueDate || "TBD",
      summary: caseData.summary || "",
      ticketIds: caseData.ticketIds || [caseData.id],
      ticketCount: String(caseData.ticketCount || 1),
      clcLastFollowUp: caseData.clcLastFollowUp || null,
      clcNextFollowUp: caseData.clcNextFollowUp || null,
      updatedAt: new Date(),
    };

    if (existingCase.length > 0) {
      await db
        .update(workerCases)
        .set(dbData)
        .where(eq(workerCases.id, caseData.id));
    } else {
      await db.insert(workerCases).values(dbData);
    }
  }

  async clearAllWorkerCases(): Promise<void> {
    await db.delete(caseAttachments);
    await db.delete(workerCases);
  }
}

export const storage: IStorage = new DbStorage();
