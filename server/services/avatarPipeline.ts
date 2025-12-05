import {
  AvatarPipelineConfig,
  AvatarPipelineStatus,
  AvatarPipelineType,
  AvatarRenderSession,
  FallbackCondition,
  FallbackConditionType,
} from "../../shared/schema";
import { avatarPipelineConfig as DEFAULT_CONFIG } from "../config/avatarPipeline.config";
import { gpuMonitor } from "./gpuMonitor";

interface SystemMetrics {
  a2f_sdk_available: boolean;
  flame_available: boolean;
  vram_gb: number;
}

class AvatarPipelineService {
  private config: AvatarPipelineConfig;
  private activeSessions: Map<string, AvatarRenderSession> = new Map();
  private consecutiveRenderFailures: number = 0;
  private lastChecked: Date = new Date();
  private currentPipeline: AvatarPipelineType = "a2f_flame";
  private triggeredCondition: FallbackConditionType | null = null;

  constructor(config: AvatarPipelineConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Check if A2F SDK is available within the configured timeout
   */
  async checkA2FSdkAvailability(): Promise<boolean> {
    const condition = this.config.fallback_conditions.find(
      (c) => c.type === "a2f_sdk_unavailable"
    );
    const timeout = condition?.type === "a2f_sdk_unavailable" ? condition.timeout_ms : 500;

    try {
      // In production, this would ping the A2F SDK endpoint
      // For now, we simulate the availability check
      const available = await this.pingWithTimeout("a2f_sdk", timeout);
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Check if FLAME service is available within the configured timeout
   */
  async checkFlameAvailability(): Promise<boolean> {
    const condition = this.config.fallback_conditions.find(
      (c) => c.type === "flame_unavailable"
    );
    const timeout = condition?.type === "flame_unavailable" ? condition.timeout_ms : 1000;

    try {
      // In production, this would ping the FLAME service endpoint
      const available = await this.pingWithTimeout("flame", timeout);
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Get current VRAM availability in GB
   */
  async getVramAvailability(): Promise<number> {
    // Query GPU VRAM via nvidia-smi (falls back to simulation if unavailable)
    return gpuMonitor.getFreeVramGb();
  }

  /**
   * Get the number of concurrent render sessions
   */
  getConcurrentSessionCount(): number {
    // Clean up stale sessions (inactive for more than 5 minutes)
    const staleThreshold = Date.now() - 5 * 60 * 1000;
    for (const [id, session] of this.activeSessions) {
      if (new Date(session.last_activity).getTime() < staleThreshold) {
        this.activeSessions.delete(id);
      }
    }
    return this.activeSessions.size;
  }

  /**
   * Record a render failure
   */
  recordRenderFailure(): void {
    this.consecutiveRenderFailures++;
  }

  /**
   * Reset the render failure counter (call on successful render)
   */
  resetRenderFailures(): void {
    this.consecutiveRenderFailures = 0;
  }

  /**
   * Evaluate all fallback conditions and determine which pipeline to use
   */
  async evaluateFallbackConditions(): Promise<{
    shouldFallback: boolean;
    triggeredCondition: FallbackConditionType | null;
    metrics: SystemMetrics;
  }> {
    const [a2fAvailable, flameAvailable, vramGb] = await Promise.all([
      this.checkA2FSdkAvailability(),
      this.checkFlameAvailability(),
      this.getVramAvailability(),
    ]);

    const concurrentSessions = this.getConcurrentSessionCount();
    const metrics: SystemMetrics = {
      a2f_sdk_available: a2fAvailable,
      flame_available: flameAvailable,
      vram_gb: vramGb,
    };

    for (const condition of this.config.fallback_conditions) {
      const triggered = this.evaluateCondition(condition, {
        ...metrics,
        concurrent_sessions: concurrentSessions,
        consecutive_failures: this.consecutiveRenderFailures,
      });

      if (triggered) {
        return {
          shouldFallback: true,
          triggeredCondition: condition.type,
          metrics,
        };
      }
    }

    return {
      shouldFallback: false,
      triggeredCondition: null,
      metrics,
    };
  }

  /**
   * Evaluate a single fallback condition
   */
  private evaluateCondition(
    condition: FallbackCondition,
    state: {
      a2f_sdk_available: boolean;
      flame_available: boolean;
      vram_gb: number;
      concurrent_sessions: number;
      consecutive_failures: number;
    }
  ): boolean {
    switch (condition.type) {
      case "a2f_sdk_unavailable":
        return !state.a2f_sdk_available;

      case "flame_unavailable":
        return !state.flame_available;

      case "vram_low":
        return state.vram_gb < condition.threshold_gb;

      case "high_load":
        return state.concurrent_sessions >= condition.concurrent_sessions;

      case "render_failure":
        return state.consecutive_failures >= condition.consecutive_failures;

      default:
        return false;
    }
  }

  /**
   * Get the appropriate pipeline based on current conditions
   */
  async selectPipeline(): Promise<AvatarPipelineType> {
    const { shouldFallback, triggeredCondition, metrics } =
      await this.evaluateFallbackConditions();

    this.lastChecked = new Date();
    this.triggeredCondition = triggeredCondition;

    if (shouldFallback) {
      this.currentPipeline = this.config.fallback_pipeline;
      console.log(
        `[AvatarPipeline] Falling back to ${this.config.fallback_pipeline} due to: ${triggeredCondition}`,
        { metrics, concurrent_sessions: this.getConcurrentSessionCount() }
      );
    } else {
      this.currentPipeline = "a2f_flame";
      console.log("[AvatarPipeline] Using primary pipeline: a2f_flame");
    }

    return this.currentPipeline;
  }

  /**
   * Start a new render session
   */
  startSession(sessionId: string): AvatarRenderSession {
    const session: AvatarRenderSession = {
      id: sessionId,
      pipeline: this.currentPipeline,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };
    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.last_activity = new Date().toISOString();
    }
  }

  /**
   * End a render session
   */
  endSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }

  /**
   * Get the current pipeline status
   */
  async getStatus(): Promise<AvatarPipelineStatus> {
    const [a2fAvailable, flameAvailable, vramGb] = await Promise.all([
      this.checkA2FSdkAvailability(),
      this.checkFlameAvailability(),
      this.getVramAvailability(),
    ]);

    return {
      active_pipeline: this.currentPipeline,
      is_fallback: this.currentPipeline === this.config.fallback_pipeline,
      triggered_condition: this.triggeredCondition,
      a2f_sdk_available: a2fAvailable,
      flame_available: flameAvailable,
      vram_gb: vramGb,
      concurrent_sessions: this.getConcurrentSessionCount(),
      consecutive_render_failures: this.consecutiveRenderFailures,
      last_checked: this.lastChecked.toISOString(),
    };
  }

  /**
   * Update the pipeline configuration
   */
  updateConfig(config: Partial<AvatarPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the current configuration
   */
  getConfig(): AvatarPipelineConfig {
    return { ...this.config };
  }

  // --- Private helper methods ---

  private async pingWithTimeout(
    service: "a2f_sdk" | "flame",
    timeoutMs: number
  ): Promise<boolean> {
    // In production, implement actual service health checks here
    // This is a placeholder that simulates the check
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% availability
        resolve(Math.random() > 0.05);
      }, Math.min(timeoutMs / 2, 100));
    });
  }

}

// Singleton instance
export const avatarPipelineService = new AvatarPipelineService();

// Export for custom configuration
export { AvatarPipelineService, DEFAULT_CONFIG };
