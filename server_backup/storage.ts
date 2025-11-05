import type { WorkerCase, WorkerCaseDB } from "@shared/schema";
import { db } from "./db";
import { workerCases, caseAttachments } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
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
