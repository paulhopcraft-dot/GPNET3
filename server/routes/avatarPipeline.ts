import { Router } from "express";
import { avatarPipelineService, AvatarPipelineService } from "../services/avatarPipeline";
import type { AvatarPipelineConfig } from "../../shared/schema";

const router = Router();

/**
 * GET /api/avatar/pipeline/status
 * Returns the current pipeline status including active pipeline, fallback state, and metrics
 */
router.get("/status", async (_req, res) => {
  try {
    const status = await avatarPipelineService.getStatus();
    res.json(status);
  } catch (error) {
    console.error("[AvatarPipeline] Error getting status:", error);
    res.status(500).json({
      error: "Failed to get pipeline status",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/avatar/pipeline/config
 * Returns the current pipeline configuration
 */
router.get("/config", (_req, res) => {
  try {
    const config = avatarPipelineService.getConfig();
    res.json(config);
  } catch (error) {
    console.error("[AvatarPipeline] Error getting config:", error);
    res.status(500).json({
      error: "Failed to get pipeline config",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/avatar/pipeline/config
 * Updates the pipeline configuration
 */
router.put("/config", (req, res) => {
  try {
    const config: Partial<AvatarPipelineConfig> = req.body;

    if (config.fallback_conditions) {
      // Validate fallback conditions
      for (const condition of config.fallback_conditions) {
        if (!condition.type) {
          return res.status(400).json({ error: "Each condition must have a type" });
        }
      }
    }

    avatarPipelineService.updateConfig(config);
    res.json({
      success: true,
      config: avatarPipelineService.getConfig(),
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error updating config:", error);
    res.status(500).json({
      error: "Failed to update pipeline config",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/select
 * Evaluates conditions and selects the appropriate pipeline
 */
router.post("/select", async (_req, res) => {
  try {
    const pipeline = await avatarPipelineService.selectPipeline();
    const status = await avatarPipelineService.getStatus();
    res.json({
      selected_pipeline: pipeline,
      status,
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error selecting pipeline:", error);
    res.status(500).json({
      error: "Failed to select pipeline",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/session/start
 * Starts a new render session
 */
router.post("/session/start", (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    const session = avatarPipelineService.startSession(session_id);
    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error starting session:", error);
    res.status(500).json({
      error: "Failed to start session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/session/end
 * Ends a render session
 */
router.post("/session/end", (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    avatarPipelineService.endSession(session_id);
    res.json({
      success: true,
      message: `Session ${session_id} ended`,
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error ending session:", error);
    res.status(500).json({
      error: "Failed to end session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/session/heartbeat
 * Updates session activity timestamp
 */
router.post("/session/heartbeat", (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    avatarPipelineService.updateSessionActivity(session_id);
    res.json({
      success: true,
      message: `Session ${session_id} heartbeat recorded`,
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error recording heartbeat:", error);
    res.status(500).json({
      error: "Failed to record heartbeat",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/render/failure
 * Records a render failure
 */
router.post("/render/failure", (_req, res) => {
  try {
    avatarPipelineService.recordRenderFailure();
    res.json({
      success: true,
      message: "Render failure recorded",
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error recording failure:", error);
    res.status(500).json({
      error: "Failed to record render failure",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/avatar/pipeline/render/success
 * Resets the render failure counter
 */
router.post("/render/success", (_req, res) => {
  try {
    avatarPipelineService.resetRenderFailures();
    res.json({
      success: true,
      message: "Render failures reset",
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error resetting failures:", error);
    res.status(500).json({
      error: "Failed to reset render failures",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/avatar/pipeline/evaluate
 * Evaluates fallback conditions without changing state
 */
router.get("/evaluate", async (_req, res) => {
  try {
    const result = await avatarPipelineService.evaluateFallbackConditions();
    res.json({
      should_fallback: result.shouldFallback,
      triggered_condition: result.triggeredCondition,
      metrics: result.metrics,
      concurrent_sessions: avatarPipelineService.getConcurrentSessionCount(),
    });
  } catch (error) {
    console.error("[AvatarPipeline] Error evaluating conditions:", error);
    res.status(500).json({
      error: "Failed to evaluate fallback conditions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
