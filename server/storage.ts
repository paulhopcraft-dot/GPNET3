import type { WorkerCase, WorkerCaseDB } from "@shared/schema";
import { db } from "./db";
import { workerCases, caseAttachments } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getGPNet2Cases(): Promise<WorkerCase[]>;
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
}

export const storage: IStorage = new DbStorage();
