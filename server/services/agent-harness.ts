/**
 * Agent Harness for Long-Running Processes
 *
 * Implements patterns from Anthropic's "Effective harnesses for long-running agents":
 * - Progress file persistence (like claude-progress.txt)
 * - JSON-based feature/task tracking with boolean status
 * - Session startup protocol with state verification
 * - Graceful recovery from interruptions
 *
 * @see https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
 */

import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";

// ============================================================================
// Types
// ============================================================================

export interface AgentProgressEntry {
  timestamp: string;
  agent: string;
  action: string;
  details?: Record<string, unknown>;
  success: boolean;
}

export interface AgentProgress {
  version: "1.0";
  lastUpdated: string;
  sessionId: string;
  entries: AgentProgressEntry[];
}

export interface FeatureChecklistItem {
  id: string;
  category: string;
  description: string;
  steps: string[];
  passes: boolean;
  lastChecked?: string;
  error?: string;
}

export interface FeatureChecklist {
  version: "1.0";
  lastUpdated: string;
  features: FeatureChecklistItem[];
}

export interface SessionState {
  startedAt: string;
  lastActivity: string;
  processedItems: number;
  pendingItems: number;
  errors: string[];
  recoveryAttempts: number;
}

// ============================================================================
// Agent Progress Tracker (implements claude-progress.txt pattern)
// ============================================================================

export class AgentProgressTracker {
  private readonly progressFile: string;
  private progress: AgentProgress;
  private readonly maxEntries = 1000;

  constructor(dataDir: string = path.join(process.cwd(), "data")) {
    this.progressFile = path.join(dataDir, "agent-progress.json");
    this.progress = this.createEmptyProgress();
  }

  private createEmptyProgress(): AgentProgress {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      entries: [],
    };
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.progressFile);
    await fsp.mkdir(dir, { recursive: true });

    if (fs.existsSync(this.progressFile)) {
      try {
        const content = await fsp.readFile(this.progressFile, "utf-8");
        const loaded = JSON.parse(content) as AgentProgress;
        // Start new session but preserve history
        this.progress = {
          ...loaded,
          sessionId: this.generateSessionId(),
          lastUpdated: new Date().toISOString(),
        };
        console.log(`[AgentHarness] Resumed from previous progress (${loaded.entries.length} entries)`);
      } catch (error) {
        console.warn("[AgentHarness] Could not load previous progress, starting fresh");
        this.progress = this.createEmptyProgress();
      }
    }
  }

  async logAction(
    agent: string,
    action: string,
    success: boolean,
    details?: Record<string, unknown>
  ): Promise<void> {
    const entry: AgentProgressEntry = {
      timestamp: new Date().toISOString(),
      agent,
      action,
      success,
      details,
    };

    this.progress.entries.push(entry);
    this.progress.lastUpdated = entry.timestamp;

    // Trim old entries if exceeding max
    if (this.progress.entries.length > this.maxEntries) {
      this.progress.entries = this.progress.entries.slice(-this.maxEntries);
    }

    await this.persist();
  }

  async persist(): Promise<void> {
    await fsp.writeFile(
      this.progressFile,
      JSON.stringify(this.progress, null, 2),
      "utf-8"
    );
  }

  getRecentEntries(count: number = 50): AgentProgressEntry[] {
    return this.progress.entries.slice(-count);
  }

  getEntriesForAgent(agent: string): AgentProgressEntry[] {
    return this.progress.entries.filter((e) => e.agent === agent);
  }

  getFailedActions(): AgentProgressEntry[] {
    return this.progress.entries.filter((e) => !e.success);
  }

  getCurrentSessionId(): string {
    return this.progress.sessionId;
  }

  /**
   * Generates a summary suitable for agent context injection
   * (Similar to reading claude-progress.txt at session start)
   */
  generateContextSummary(): string {
    const recent = this.getRecentEntries(20);
    const failures = this.getFailedActions().slice(-5);

    const lines: string[] = [
      `# Agent Progress Summary`,
      `Session: ${this.progress.sessionId}`,
      `Last Updated: ${this.progress.lastUpdated}`,
      `Total Actions: ${this.progress.entries.length}`,
      "",
      "## Recent Activity",
    ];

    for (const entry of recent) {
      const status = entry.success ? "[OK]" : "[FAIL]";
      lines.push(`- ${status} ${entry.agent}: ${entry.action}`);
    }

    if (failures.length > 0) {
      lines.push("", "## Recent Failures (need attention)");
      for (const entry of failures) {
        lines.push(`- ${entry.agent}: ${entry.action} - ${entry.details?.error ?? "unknown error"}`);
      }
    }

    return lines.join("\n");
  }
}

// ============================================================================
// Feature Checklist (implements JSON feature list with passes: boolean)
// ============================================================================

export class FeatureChecklistManager {
  private readonly checklistFile: string;
  private checklist: FeatureChecklist;

  constructor(dataDir: string = path.join(process.cwd(), "data")) {
    this.checklistFile = path.join(dataDir, "feature-checklist.json");
    this.checklist = this.createEmptyChecklist();
  }

  private createEmptyChecklist(): FeatureChecklist {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),
      features: [],
    };
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.checklistFile);
    await fsp.mkdir(dir, { recursive: true });

    if (fs.existsSync(this.checklistFile)) {
      try {
        const content = await fsp.readFile(this.checklistFile, "utf-8");
        this.checklist = JSON.parse(content) as FeatureChecklist;
        console.log(`[AgentHarness] Loaded feature checklist (${this.checklist.features.length} features)`);
      } catch (error) {
        console.warn("[AgentHarness] Could not load feature checklist, starting fresh");
      }
    }
  }

  async addFeature(feature: Omit<FeatureChecklistItem, "passes" | "lastChecked">): Promise<void> {
    const existing = this.checklist.features.find((f) => f.id === feature.id);
    if (existing) {
      return; // Feature already tracked
    }

    this.checklist.features.push({
      ...feature,
      passes: false, // All features start as failing per article recommendation
    });
    this.checklist.lastUpdated = new Date().toISOString();
    await this.persist();
  }

  async markFeature(id: string, passes: boolean, error?: string): Promise<void> {
    const feature = this.checklist.features.find((f) => f.id === id);
    if (!feature) {
      console.warn(`[AgentHarness] Feature ${id} not found in checklist`);
      return;
    }

    feature.passes = passes;
    feature.lastChecked = new Date().toISOString();
    feature.error = error;
    this.checklist.lastUpdated = new Date().toISOString();
    await this.persist();
  }

  async persist(): Promise<void> {
    await fsp.writeFile(
      this.checklistFile,
      JSON.stringify(this.checklist, null, 2),
      "utf-8"
    );
  }

  getFailingFeatures(): FeatureChecklistItem[] {
    return this.checklist.features.filter((f) => !f.passes);
  }

  getPassingFeatures(): FeatureChecklistItem[] {
    return this.checklist.features.filter((f) => f.passes);
  }

  getFeaturesByCategory(category: string): FeatureChecklistItem[] {
    return this.checklist.features.filter((f) => f.category === category);
  }

  /**
   * Get the highest priority incomplete feature (for agent to work on next)
   */
  getNextFeatureToImplement(): FeatureChecklistItem | undefined {
    return this.checklist.features.find((f) => !f.passes);
  }

  /**
   * Generates summary for agent context (prevents premature completion claims)
   */
  generateStatusReport(): string {
    const passing = this.getPassingFeatures();
    const failing = this.getFailingFeatures();

    const lines: string[] = [
      `# Feature Checklist Status`,
      `Last Updated: ${this.checklist.lastUpdated}`,
      `Progress: ${passing.length}/${this.checklist.features.length} features passing`,
      "",
    ];

    if (failing.length > 0) {
      lines.push("## Failing Features (work needed)");
      for (const f of failing) {
        lines.push(`- [ ] ${f.id}: ${f.description}`);
        if (f.error) {
          lines.push(`      Error: ${f.error}`);
        }
      }
      lines.push("");
    }

    if (passing.length > 0) {
      lines.push("## Passing Features");
      for (const f of passing) {
        lines.push(`- [x] ${f.id}: ${f.description}`);
      }
    }

    return lines.join("\n");
  }
}

// ============================================================================
// Session State Manager (implements startup protocol)
// ============================================================================

export class SessionStateManager {
  private readonly stateFile: string;
  private state: SessionState;

  constructor(
    private readonly agentName: string,
    dataDir: string = path.join(process.cwd(), "data")
  ) {
    this.stateFile = path.join(dataDir, `${agentName}-session.json`);
    this.state = this.createFreshState();
  }

  private createFreshState(): SessionState {
    return {
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      processedItems: 0,
      pendingItems: 0,
      errors: [],
      recoveryAttempts: 0,
    };
  }

  async initialize(): Promise<{ isRecovery: boolean; previousState?: SessionState }> {
    const dir = path.dirname(this.stateFile);
    await fsp.mkdir(dir, { recursive: true });

    if (fs.existsSync(this.stateFile)) {
      try {
        const content = await fsp.readFile(this.stateFile, "utf-8");
        const previousState = JSON.parse(content) as SessionState;

        // Check if previous session was interrupted (has pending items or recent activity)
        const lastActivity = new Date(previousState.lastActivity);
        const timeSinceActivity = Date.now() - lastActivity.getTime();
        const wasInterrupted = previousState.pendingItems > 0 && timeSinceActivity < 3600000; // 1 hour

        if (wasInterrupted) {
          console.log(`[AgentHarness] Recovering ${this.agentName} session (${previousState.pendingItems} pending items)`);
          this.state = {
            ...previousState,
            lastActivity: new Date().toISOString(),
            recoveryAttempts: previousState.recoveryAttempts + 1,
          };
          await this.persist();
          return { isRecovery: true, previousState };
        }

        // Start fresh but log recovery
        console.log(`[AgentHarness] Starting fresh ${this.agentName} session (previous completed normally)`);
        this.state = this.createFreshState();
        await this.persist();
        return { isRecovery: false, previousState };
      } catch (error) {
        console.warn(`[AgentHarness] Could not load ${this.agentName} state, starting fresh`);
      }
    }

    await this.persist();
    return { isRecovery: false };
  }

  async updateProgress(processed: number, pending: number): Promise<void> {
    this.state.processedItems = processed;
    this.state.pendingItems = pending;
    this.state.lastActivity = new Date().toISOString();
    await this.persist();
  }

  async recordError(error: string): Promise<void> {
    this.state.errors.push(`[${new Date().toISOString()}] ${error}`);
    // Keep only last 50 errors
    if (this.state.errors.length > 50) {
      this.state.errors = this.state.errors.slice(-50);
    }
    this.state.lastActivity = new Date().toISOString();
    await this.persist();
  }

  async markComplete(): Promise<void> {
    this.state.pendingItems = 0;
    this.state.lastActivity = new Date().toISOString();
    await this.persist();
  }

  private async persist(): Promise<void> {
    await fsp.writeFile(
      this.stateFile,
      JSON.stringify(this.state, null, 2),
      "utf-8"
    );
  }

  getState(): SessionState {
    return { ...this.state };
  }
}

// ============================================================================
// Default Case Processing Milestones (specific to GPNET3)
// ============================================================================

export function getDefaultCaseMilestones(): Omit<FeatureChecklistItem, "passes" | "lastChecked">[] {
  return [
    {
      id: "transcript-ingestion",
      category: "data-pipeline",
      description: "Transcript ingestion module processes files correctly",
      steps: [
        "Watch transcripts directory for new files",
        "Parse transcript content and extract worker name",
        "Fuzzy match worker to existing case",
        "Persist discussion notes and insights",
        "Notify task agent of new notes",
      ],
    },
    {
      id: "case-summary-generation",
      category: "ai-processing",
      description: "AI generates structured case summaries",
      steps: [
        "Retrieve case data from database",
        "Build system and user prompts",
        "Call Claude API for summary generation",
        "Extract work status classification",
        "Cache summary in database",
      ],
    },
    {
      id: "compliance-assessment",
      category: "ai-processing",
      description: "Compliance advisor provides accurate assessments",
      steps: [
        "Process compliance query via chat endpoint",
        "Include case context in prompt",
        "Return structured compliance guidance",
      ],
    },
    {
      id: "freshdesk-sync",
      category: "integration",
      description: "Freshdesk ticket sync updates cases correctly",
      steps: [
        "Fetch tickets from Freshdesk API",
        "Merge duplicate tickets by worker name",
        "Update case records in database",
        "Trigger summary refresh if needed",
      ],
    },
    {
      id: "recovery-timeline",
      category: "data-pipeline",
      description: "Medical certificate timeline displays accurately",
      steps: [
        "Fetch certificates for case",
        "Calculate recovery summary statistics",
        "Display timeline in UI",
      ],
    },
    {
      id: "termination-workflow",
      category: "workflow",
      description: "Termination process tracks all stages correctly",
      steps: [
        "Initialize termination process for case",
        "Track 18 stage progression",
        "Update compliance requirements at each stage",
        "Generate audit events",
      ],
    },
  ];
}

// ============================================================================
// Singleton Instances
// ============================================================================

let progressTracker: AgentProgressTracker | null = null;
let featureChecklist: FeatureChecklistManager | null = null;

export async function getProgressTracker(): Promise<AgentProgressTracker> {
  if (!progressTracker) {
    progressTracker = new AgentProgressTracker();
    await progressTracker.initialize();
  }
  return progressTracker;
}

export async function getFeatureChecklist(): Promise<FeatureChecklistManager> {
  if (!featureChecklist) {
    featureChecklist = new FeatureChecklistManager();
    await featureChecklist.initialize();

    // Seed with default milestones if empty
    const failing = featureChecklist.getFailingFeatures();
    const passing = featureChecklist.getPassingFeatures();
    if (failing.length === 0 && passing.length === 0) {
      for (const milestone of getDefaultCaseMilestones()) {
        await featureChecklist.addFeature(milestone);
      }
    }
  }
  return featureChecklist;
}
