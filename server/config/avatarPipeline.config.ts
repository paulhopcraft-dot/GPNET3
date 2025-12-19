import { AvatarPipelineConfig } from "../../shared/schema";

/**
 * Avatar Pipeline Configuration
 *
 * Defines fallback conditions for switching from the primary A2F/FLAME pipeline
 * to the fallback LivePortrait/MediaPipe pipeline.
 */
export const avatarPipelineConfig: AvatarPipelineConfig = {
  fallback_conditions: [
    {
      type: "a2f_sdk_unavailable",
      timeout_ms: 500,
    },
    {
      type: "flame_unavailable",
      timeout_ms: 1000,
    },
    {
      type: "vram_low",
      threshold_gb: 6,
    },
    {
      type: "high_load",
      concurrent_sessions: 2,
    },
    {
      type: "render_failure",
      consecutive_failures: 3,
    },
  ],
  fallback_pipeline: "liveportrait_mediapipe",
};

export default avatarPipelineConfig;
