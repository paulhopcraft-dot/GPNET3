import type { CaseDiscussionNote, TranscriptInsight } from "@shared/schema";
import { createLogger } from "../../lib/logger";

const taskAgentLogger = createLogger("TranscriptTaskAgent");

export interface TranscriptIngestionEvent {
  caseId: string;
  workerName: string;
  notes: CaseDiscussionNote[];
  insights: TranscriptInsight[];
}

export interface TaskNotificationAgent {
  notifyNewDiscussionNotes(event: TranscriptIngestionEvent): Promise<void>;
}

/**
 * Basic in-memory agent that simply logs notifications and stores
 * them for later inspection. This allows future Task/Audit systems
 * to plug in without changing the ingestion pipeline.
 */
export class LoggingTaskNotificationAgent implements TaskNotificationAgent {
  private readonly events: TranscriptIngestionEvent[] = [];

  async notifyNewDiscussionNotes(event: TranscriptIngestionEvent): Promise<void> {
    this.events.push(event);
    const latest = event.notes[0];
    taskAgentLogger.info("Queued discussion notes", {
      noteCount: event.notes.length,
      workerName: event.workerName,
      caseId: event.caseId,
      lastSummary: latest?.summary,
    });
  }

  getPendingEvents(): TranscriptIngestionEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
