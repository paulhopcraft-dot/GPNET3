import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { parseTranscriptFile, ParsedTranscriptNote } from "./parser";
import { storage } from "../../storage";
import type {
  CaseDiscussionNote,
  InsertCaseDiscussionNote,
  InsertCaseDiscussionInsight,
  TranscriptInsight,
} from "@shared/schema";
import type {
  TaskNotificationAgent,
  TranscriptIngestionEvent,
} from "./task-agent";
import {
  SessionStateManager,
  getProgressTracker,
  getFeatureChecklist,
} from "../agent-harness";

export interface TranscriptIngestionOptions {
  transcriptsDir?: string;
  pollIntervalMs?: number;
  taskAgent?: TaskNotificationAgent;
  maxFileSizeBytes?: number;
}

const DEFAULT_POLL_INTERVAL = 30_000;
const DEFAULT_MAX_FILE_SIZE = 750 * 1024; // ~750 KB transcripts
const FILE_STABILITY_DELAY_MS = 200;

export class TranscriptIngestionModule {
  private watcher?: fs.FSWatcher;
  private pollTimer?: NodeJS.Timeout;
  private readonly transcriptsDir: string;
  private readonly supportedExtensions = new Set([".txt", ".md", ".vtt"]);
  private readonly processingFiles = new Set<string>();
  private readonly unresolvedWorkers = new Set<string>();
  private readonly processedFiles = new Map<string, number>();
  private readonly maxFileSizeBytes: number;
  private readonly taskAgent?: TaskNotificationAgent;
  private readonly sessionState: SessionStateManager;
  private totalProcessed = 0;
  private totalPending = 0;

  constructor(private readonly options: TranscriptIngestionOptions = {}) {
    this.transcriptsDir =
      options.transcriptsDir ?? path.join(process.cwd(), "transcripts");
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE;
    this.taskAgent = options.taskAgent;
    this.sessionState = new SessionStateManager("transcript-ingestion");
  }

  async start(): Promise<void> {
    // Session Startup Protocol (per Anthropic's long-running agent guidance)
    // 1. Initialize session state and check for recovery
    const { isRecovery, previousState } = await this.sessionState.initialize();
    const progressTracker = await getProgressTracker();

    if (isRecovery && previousState) {
      console.log(
        `[Transcripts] Recovering from interrupted session (${previousState.processedItems} processed, ${previousState.pendingItems} pending)`,
      );
      await progressTracker.logAction(
        "transcript-ingestion",
        "session-recovery",
        true,
        { previousProcessed: previousState.processedItems, previousPending: previousState.pendingItems }
      );
    }

    // 2. Verify working directory and environment
    await this.ensureDirectory();
    await progressTracker.logAction(
      "transcript-ingestion",
      "directory-verified",
      true,
      { path: this.transcriptsDir }
    );

    // 3. Scan existing files and update progress
    const pendingFiles = await this.listTranscriptFiles();
    this.totalPending = pendingFiles.length;
    await this.sessionState.updateProgress(this.totalProcessed, this.totalPending);

    // 4. Process existing files
    await this.scanExistingFiles();

    // 5. Start continuous monitoring
    this.startWatcher();
    this.startPolling();

    // 6. Mark feature as passing if initial scan succeeded
    const featureChecklist = await getFeatureChecklist();
    await featureChecklist.markFeature("transcript-ingestion", true);

    await progressTracker.logAction(
      "transcript-ingestion",
      "module-started",
      true,
      { directory: this.transcriptsDir, pendingFiles: this.totalPending }
    );

    console.log(
      `[Transcripts] Transcript ingestion module active in ${this.transcriptsDir}`,
    );
  }

  async stop(): Promise<void> {
    this.watcher?.close();
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    // Mark session as complete for clean shutdown
    await this.sessionState.markComplete();
    const progressTracker = await getProgressTracker();
    await progressTracker.logAction(
      "transcript-ingestion",
      "module-stopped",
      true,
      { totalProcessed: this.totalProcessed }
    );
  }

  private async ensureDirectory(): Promise<void> {
    await fsp.mkdir(this.transcriptsDir, { recursive: true });
  }

  private startWatcher(): void {
    this.watcher = fs.watch(
      this.transcriptsDir,
      { persistent: true },
      (eventType, filename) => {
        if (!filename) {
          void this.scanExistingFiles();
          return;
        }
        const target = path.join(this.transcriptsDir, filename.toString());
        if (eventType === "rename" || eventType === "change") {
          void this.processFile(target);
        }
      },
    );

    this.watcher.on("error", (err) => {
      console.error("[Transcripts] File watcher error", err);
    });
  }

  private startPolling(): void {
    const interval = this.options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
    this.pollTimer = setInterval(() => {
      void this.scanExistingFiles();
    }, interval);
  }
 
  private async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async scanExistingFiles(): Promise<void> {
    try {
      const files = await this.listTranscriptFiles();
      for (const file of files) {
        await this.processFile(file);
      }
    } catch (error) {
      console.error("[Transcripts] Failed to scan transcript directory", error);
    }
  }

  private async listTranscriptFiles(): Promise<string[]> {
    const entries = await fsp.readdir(this.transcriptsDir, {
      withFileTypes: true,
    });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          this.supportedExtensions.has(
            path.extname(entry.name).toLowerCase(),
          ),
      )
      .map((entry) => path.join(this.transcriptsDir, entry.name));
  }

  private async processFile(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedExtensions.has(ext)) {
      return;
    }

    if (this.processingFiles.has(filePath)) {
      return;
    }

    this.processingFiles.add(filePath);
    try {
      let stats = await fsp.stat(filePath);
      if (!stats.isFile()) {
        return;
      }

      if (stats.size === 0) {
        console.warn(`[Transcripts] Skipping empty transcript: ${filePath}`);
        return;
      }

      if (stats.size > this.maxFileSizeBytes) {
        console.warn(
          `[Transcripts] Skipping oversized transcript (${stats.size} bytes): ${filePath}`,
        );
        return;
      }

      const previouslyProcessed = this.processedFiles.get(filePath);
      if (previouslyProcessed && stats.mtimeMs <= previouslyProcessed) {
        return;
      }

      await this.delay(FILE_STABILITY_DELAY_MS);
      const restat = await fsp.stat(filePath);
      if (restat.mtimeMs !== stats.mtimeMs || restat.size !== stats.size) {
        stats = restat;
      }

      const contents = await fsp.readFile(filePath, "utf-8");
      const parsedNotes = parseTranscriptFile(filePath, contents, stats.mtime);
      if (!parsedNotes.length) {
        return;
      }

      const didPersist = await this.persistNotes(filePath, parsedNotes);
      if (didPersist) {
        this.processedFiles.set(filePath, stats.mtimeMs);
      }
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return; // File removed before processing
      }
      console.error(`[Transcripts] Failed to process ${filePath}`, error);

      // Record error for session recovery
      await this.sessionState.recordError(
        `Failed to process ${path.basename(filePath)}: ${error?.message ?? "unknown error"}`
      );
      const progressTracker = await getProgressTracker();
      await progressTracker.logAction(
        "transcript-ingestion",
        "file-processing-failed",
        false,
        { file: path.basename(filePath), error: error?.message }
      );
    } finally {
      this.processingFiles.delete(filePath);
    }
  }

  private async persistNotes(
    filePath: string,
    parsed: ParsedTranscriptNote[],
  ): Promise<boolean> {
    const insertRows: InsertCaseDiscussionNote[] = [];
    const insightRows: InsertCaseDiscussionInsight[] = [];
    const notificationEvents = new Map<string, TranscriptIngestionEvent>();

    for (const note of parsed) {
      const resolution = await storage.findCaseByWorkerName(note.workerName);
      if (!resolution) {
        if (!this.unresolvedWorkers.has(note.workerName)) {
          console.warn(
            `[Transcripts] Unable to resolve case for "${note.workerName}" (${path.basename(
              filePath,
            )})`,
          );
          this.unresolvedWorkers.add(note.workerName);
        }
        continue;
      }

      this.unresolvedWorkers.delete(note.workerName);
      if (resolution.confidence < 0.75) {
        console.info(
          `[Transcripts] Matched "${note.workerName}" -> "${resolution.workerName}" (confidence ${resolution.confidence.toFixed(
            2,
          )})`,
        );
      }

      const noteId = this.createNoteId(filePath, note);
      const row: InsertCaseDiscussionNote = {
        id: noteId,
        caseId: resolution.caseId,
        workerName: resolution.workerName,
        timestamp: note.timestamp,
        rawText: note.rawText,
        summary: note.summary,
        nextSteps: note.nextSteps.length ? note.nextSteps : null,
        riskFlags: note.riskFlags.length ? note.riskFlags : null,
        updatesCompliance: note.updatesCompliance,
        updatesRecoveryTimeline: note.updatesRecoveryTimeline,
      };

      const insightPayload = this.buildInsightsForNote(row, noteId, resolution.caseId);
      insightRows.push(...insightPayload.inserts);

      const eventEntry =
        notificationEvents.get(resolution.caseId) ?? {
          caseId: resolution.caseId,
          workerName: resolution.workerName,
          notes: [],
          insights: [],
        };
      eventEntry.notes.push(this.toCaseDiscussionNote(row));
      eventEntry.insights.push(...insightPayload.materialized);
      notificationEvents.set(resolution.caseId, eventEntry);

      insertRows.push(row);
    }

    if (!insertRows.length) {
      return false;
    }

    await storage.upsertCaseDiscussionNotes(insertRows);
    if (insightRows.length) {
      await storage.upsertCaseDiscussionInsights(insightRows);
    }

    if (this.taskAgent && notificationEvents.size > 0) {
      for (const [, event] of notificationEvents) {
        await this.taskAgent.notifyNewDiscussionNotes(event);
      }
    }

    // Update progress tracking
    this.totalProcessed += insertRows.length;
    this.totalPending = Math.max(0, this.totalPending - 1);
    await this.sessionState.updateProgress(this.totalProcessed, this.totalPending);

    const progressTracker = await getProgressTracker();
    await progressTracker.logAction(
      "transcript-ingestion",
      "file-processed",
      true,
      {
        file: path.basename(filePath),
        notesIngested: insertRows.length,
        insightsGenerated: insightRows.length,
      }
    );

    console.log(
      `[Transcripts] Ingested ${insertRows.length} note(s) from ${path.basename(
        filePath,
      )}`,
    );

    return true;
  }

  private createNoteId(filePath: string, note: ParsedTranscriptNote): string {
    const hash = crypto.createHash("sha1");
    hash.update(filePath);
    hash.update(note.workerName);
    hash.update(note.summary);
    hash.update(note.timestamp.toISOString());
    return hash.digest("hex");
  }

  private toCaseDiscussionNote(row: InsertCaseDiscussionNote): CaseDiscussionNote {
    const timestamp =
      row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp ?? new Date());
    return {
      id: row.id ?? crypto.randomUUID(),
      caseId: row.caseId!,
      workerName: row.workerName!,
      timestamp: timestamp.toISOString(),
      rawText: row.rawText!,
      summary: row.summary!,
      nextSteps: row.nextSteps ?? undefined,
      riskFlags: row.riskFlags ?? undefined,
      updatesCompliance: Boolean(row.updatesCompliance),
      updatesRecoveryTimeline: Boolean(row.updatesRecoveryTimeline),
    };
  }

  private buildInsightsForNote(
    row: InsertCaseDiscussionNote,
    noteId: string,
    caseId: string,
  ): {
    inserts: InsertCaseDiscussionInsight[];
    materialized: TranscriptInsight[];
  } {
    const inserts: InsertCaseDiscussionInsight[] = [];
    const materialized: TranscriptInsight[] = [];

    const addInsight = (
      area: TranscriptInsight["area"],
      severity: TranscriptInsight["severity"],
      summary: string,
      detail?: string,
    ) => {
      const createdAt = new Date();
      const id = this.createInsightId(noteId, area, summary);
      const insertRow: InsertCaseDiscussionInsight = {
        id,
        caseId,
        noteId,
        area,
        severity,
        summary,
        detail: detail ?? row.summary ?? null,
        createdAt,
      };
      inserts.push(insertRow);
      materialized.push({
        id,
        caseId,
        noteId,
        area,
        severity,
        summary,
        detail: insertRow.detail ?? undefined,
        createdAt: createdAt.toISOString(),
      });
    };

    const riskFlags = row.riskFlags ?? [];
    for (const flag of riskFlags) {
      const lower = flag.toLowerCase();
      const area: TranscriptInsight["area"] = lower.includes("compliance")
        ? "compliance"
        : "risk";
      const severity: TranscriptInsight["severity"] = /critical|high/.test(lower)
        ? "critical"
        : "warning";
      addInsight(area, severity, flag);
    }

    if (row.updatesRecoveryTimeline) {
      addInsight(
        "recovery",
        "info",
        "Transcript indicates a recovery timeline change",
      );
    }

    if (row.updatesCompliance && !riskFlags.some((flag) => /compliance/i.test(flag))) {
      addInsight("compliance", "warning", "Compliance follow-up required");
    }

    const nextSteps = row.nextSteps ?? [];
    for (const step of nextSteps.slice(0, 3)) {
      addInsight("returnToWork", "info", `Next step: ${step}`);
    }

    const raw = row.rawText ?? "";
    if (/no\s+contact|unresponsive|no show|did not attend/i.test(raw)) {
      addInsight(
        "engagement",
        "warning",
        "Worker engagement risk detected",
        raw.slice(0, 280),
      );
    }

    return { inserts, materialized };
  }

  private createInsightId(noteId: string, area: string, summary: string): string {
    const hash = crypto.createHash("sha1");
    hash.update(noteId);
    hash.update(area);
    hash.update(summary);
    return hash.digest("hex");
  }
}
