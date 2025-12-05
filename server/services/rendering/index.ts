/**
 * Avatar Rendering Pipeline Module
 *
 * Provides two rendering pipelines:
 * 1. A2F/FLAME - High-quality GPU-based rendering (primary)
 * 2. LivePortrait/MediaPipe - Lightweight fallback
 */

export * from "./types";
export { a2fFlamePipeline, A2FFlamePipeline } from "./a2fFlamePipeline";
export { livePortraitPipeline, LivePortraitMediaPipePipeline } from "./livePortraitPipeline";

import { RenderingPipeline } from "./types";
import { a2fFlamePipeline } from "./a2fFlamePipeline";
import { livePortraitPipeline } from "./livePortraitPipeline";
import type { AvatarPipelineType } from "../../../shared/schema";

/**
 * Get the rendering pipeline instance by type
 */
export function getPipeline(type: AvatarPipelineType): RenderingPipeline {
  switch (type) {
    case "a2f_flame":
      return a2fFlamePipeline;
    case "liveportrait_mediapipe":
      return livePortraitPipeline;
    default:
      throw new Error(`Unknown pipeline type: ${type}`);
  }
}

/**
 * Initialize the appropriate pipeline
 */
export async function initializePipeline(type: AvatarPipelineType): Promise<RenderingPipeline> {
  const pipeline = getPipeline(type);
  await pipeline.initialize();
  return pipeline;
}
