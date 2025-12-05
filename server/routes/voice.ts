import express, { type Request, type Response } from "express";
import crypto from "crypto";
import { avatarPipelineService } from "../services/avatarPipeline";

const router = express.Router();

// simple placeholder so import works
router.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, route: "voice placeholder" });
});

/**
 * POST /api/voice/avatar/start
 * Starts an avatar rendering session with automatic pipeline selection
 */
router.post("/avatar/start", async (req: Request, res: Response) => {
  try {
    const sessionId = req.body.session_id || crypto.randomUUID();

    // Select the appropriate pipeline based on current conditions
    const pipeline = await avatarPipelineService.selectPipeline();

    // Start the session
    const session = avatarPipelineService.startSession(sessionId);

    res.json({
      success: true,
      session_id: session.id,
      pipeline: session.pipeline,
      started_at: session.started_at,
    });
  } catch (error) {
    console.error("[Voice/Avatar] Error starting avatar session:", error);
    res.status(500).json({
      error: "Failed to start avatar session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voice/avatar/render
 * Renders a frame using the current pipeline
 */
router.post("/avatar/render", async (req: Request, res: Response) => {
  try {
    const { session_id, audio_data } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    // Update session activity
    avatarPipelineService.updateSessionActivity(session_id);

    // Get current pipeline status
    const status = await avatarPipelineService.getStatus();

    // Placeholder for actual rendering logic
    // In production, this would call the appropriate pipeline (A2F/FLAME or LivePortrait/MediaPipe)
    res.json({
      success: true,
      session_id,
      pipeline: status.active_pipeline,
      is_fallback: status.is_fallback,
      message: `Render request processed via ${status.active_pipeline} pipeline`,
    });
  } catch (error) {
    // Record the failure
    avatarPipelineService.recordRenderFailure();

    console.error("[Voice/Avatar] Render error:", error);
    res.status(500).json({
      error: "Render failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/voice/avatar/end
 * Ends an avatar rendering session
 */
router.post("/avatar/end", (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: "session_id is required" });
    }

    avatarPipelineService.endSession(session_id);

    // Reset render failures on successful session completion
    avatarPipelineService.resetRenderFailures();

    res.json({
      success: true,
      session_id,
      message: "Avatar session ended",
    });
  } catch (error) {
    console.error("[Voice/Avatar] Error ending session:", error);
    res.status(500).json({
      error: "Failed to end avatar session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
