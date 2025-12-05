import type { CaseDiscussionNote, TranscriptInsight } from "@shared/schema";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

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
    console.log(
      `[Transcripts][TaskAgent] Queued ${event.notes.length} note(s) for ${event.workerName} (case ${event.caseId}) - last summary: ${latest?.summary}`,
    );
  }

  getPendingEvents(): TranscriptIngestionEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}

/**
 * Persistent Task Notification Queue
 *
 * Implements the "progress file" pattern from Anthropic's long-running agent guidance.
 * Events are persisted to JSON on disk, allowing recovery after restarts.
 * This ensures no transcript processing events are lost between sessions.
 *
 * @see https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
 */
export interface PersistedEvent {
  id: string;
  timestamp: string;
  event: TranscriptIngestionEvent;
  processed: boolean;
  processedAt?: string;
  error?: string;
}

export interface PersistentQueueState {
  version: "1.0";
  lastUpdated: string;
  events: PersistedEvent[];
}

export class PersistentTaskNotificationAgent implements TaskNotificationAgent {
  private readonly queueFile: string;
  private state: PersistentQueueState;
  private readonly maxEvents = 500;

  constructor(dataDir: string = path.join(process.cwd(), "data")) {
    this.queueFile = path.join(dataDir, "task-queue.json");
    this.state = this.createEmptyState();
  }

  private createEmptyState(): PersistentQueueState {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      events: [],
    };
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async initialize(): Promise<{ recoveredEvents: number }> {
    const dir = path.dirname(this.queueFile);
    await fsp.mkdir(dir, { recursive: true });

    if (fs.existsSync(this.queueFile)) {
      try {
        const content = await fsp.readFile(this.queueFile, "utf-8");
        this.state = JSON.parse(content) as PersistentQueueState;

        const unprocessed = this.state.events.filter((e) => !e.processed);
        if (unprocessed.length > 0) {
          console.log(
            `[TaskAgent] Recovered ${unprocessed.length} unprocessed event(s) from previous session`,
          );
        }

        return { recoveredEvents: unprocessed.length };
      } catch (error) {
        console.warn("[TaskAgent] Could not load queue state, starting fresh");
      }
    }

    await this.persist();
    return { recoveredEvents: 0 };
  }

  async notifyNewDiscussionNotes(event: TranscriptIngestionEvent): Promise<void> {
    const persistedEvent: PersistedEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event,
      processed: false,
    };

    this.state.events.push(persistedEvent);
    this.state.lastUpdated = persistedEvent.timestamp;

    // Trim old processed events if exceeding max
    if (this.state.events.length > this.maxEvents) {
      const processedOld = this.state.events
        .filter((e) => e.processed)
        .slice(0, this.state.events.length - this.maxEvents);
      const idsToRemove = new Set(processedOld.map((e) => e.id));
      this.state.events = this.state.events.filter((e) => !idsToRemove.has(e.id));
    }

    await this.persist();

    const latest = event.notes[0];
    console.log(
      `[TaskAgent] Persisted ${event.notes.length} note(s) for ${event.workerName} (case ${event.caseId}) - summary: ${latest?.summary}`,
    );
  }

  /**
   * Mark an event as processed (for downstream consumers)
   */
  async markProcessed(eventId: string, error?: string): Promise<void> {
    const event = this.state.events.find((e) => e.id === eventId);
    if (event) {
      event.processed = true;
      event.processedAt = new Date().toISOString();
      if (error) {
        event.error = error;
      }
      this.state.lastUpdated = event.processedAt;
      await this.persist();
    }
  }

  /**
   * Get all unprocessed events (for consumers to process)
   */
  getUnprocessedEvents(): PersistedEvent[] {
    return this.state.events.filter((e) => !e.processed);
  }

  /**
   * Get events for a specific case
   */
  getEventsForCase(caseId: string): PersistedEvent[] {
    return this.state.events.filter((e) => e.event.caseId === caseId);
  }

  /**
   * Get summary suitable for agent context injection
   */
  generateQueueSummary(): string {
    const unprocessed = this.getUnprocessedEvents();
    const recentProcessed = this.state.events
      .filter((e) => e.processed)
      .slice(-10);

    const lines: string[] = [
      `# Task Queue Status`,
      `Last Updated: ${this.state.lastUpdated}`,
      `Pending: ${unprocessed.length} | Total Tracked: ${this.state.events.length}`,
      "",
    ];

    if (unprocessed.length > 0) {
      lines.push("## Pending Events (need processing)");
      for (const evt of unprocessed.slice(0, 10)) {
        lines.push(
          `- [${evt.id}] ${evt.event.workerName}: ${evt.event.notes.length} notes, ${evt.event.insights.length} insights`,
        );
      }
      if (unprocessed.length > 10) {
        lines.push(`  ... and ${unprocessed.length - 10} more`);
      }
      lines.push("");
    }

    if (recentProcessed.length > 0) {
      lines.push("## Recently Processed");
      for (const evt of recentProcessed) {
        const status = evt.error ? `[ERROR: ${evt.error}]` : "[OK]";
        lines.push(`- ${status} ${evt.event.workerName} @ ${evt.processedAt}`);
      }
    }

    return lines.join("\n");
  }

  private async persist(): Promise<void> {
    await fsp.writeFile(
      this.queueFile,
      JSON.stringify(this.state, null, 2),
      "utf-8",
    );
  }
}
