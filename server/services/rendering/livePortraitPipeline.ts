/**
 * LivePortrait + MediaPipe Rendering Pipeline
 *
 * This is the fallback pipeline that uses:
 * - MediaPipe Face Mesh for facial landmark detection
 * - LivePortrait for image-based avatar animation
 *
 * This pipeline is lighter-weight and works on systems without NVIDIA GPUs
 * or when the primary A2F/FLAME pipeline is unavailable.
 *
 * Requirements:
 * - MediaPipe (CPU or GPU)
 * - LivePortrait model
 * - Python runtime with dependencies
 */

import {
  AudioFrame,
  BlendshapeWeights,
  HeadPose,
  PipelineConfig,
  RenderFrame,
  RenderResult,
  RenderingPipeline,
} from "./types";

interface LivePortraitConfig extends PipelineConfig {
  mediapipeEndpoint?: string;
  liveportraitEndpoint?: string;
  sourceImagePath?: string;
  useCpuOnly?: boolean;
}

const DEFAULT_CONFIG: LivePortraitConfig = {
  mediapipeEndpoint: process.env.MEDIAPIPE_ENDPOINT || "http://localhost:8012",
  liveportraitEndpoint: process.env.LIVEPORTRAIT_ENDPOINT || "http://localhost:8013",
  sourceImagePath: process.env.AVATAR_SOURCE_IMAGE || "./assets/avatar_source.png",
  timeout: 1000,
  quality: "medium",
  targetFps: 25,
  useCpuOnly: false,
};

class LivePortraitMediaPipePipeline implements RenderingPipeline {
  name = "liveportrait_mediapipe";
  private config: LivePortraitConfig;
  private initialized = false;

  constructor(config?: Partial<LivePortraitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // In production, check if services are running
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeout || 1000);

      // TODO: Implement actual service health checks
      // const [mediapipe, liveportrait] = await Promise.all([
      //   fetch(`${this.config.mediapipeEndpoint}/health`, { signal: controller.signal }),
      //   fetch(`${this.config.liveportraitEndpoint}/health`, { signal: controller.signal }),
      // ]);
      // clearTimeout(timeout);
      // return mediapipe.ok && liveportrait.ok;

      clearTimeout(timeout);

      // Fallback pipeline should generally be available
      return true;
    } catch {
      return false;
    }
  }

  async initialize(config?: PipelineConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // TODO: In production, initialize MediaPipe and LivePortrait
    // await this.initMediaPipe();
    // await this.loadSourceImage();

    console.log("[LivePortrait/MediaPipe] Pipeline initialized with config:", {
      mediapipeEndpoint: this.config.mediapipeEndpoint,
      liveportraitEndpoint: this.config.liveportraitEndpoint,
      quality: this.config.quality,
      targetFps: this.config.targetFps,
      useCpuOnly: this.config.useCpuOnly,
    });

    this.initialized = true;
  }

  async processAudio(audio: AudioFrame): Promise<RenderFrame> {
    if (!this.initialized) {
      throw new Error("Pipeline not initialized. Call initialize() first.");
    }

    // Convert audio to mouth/face parameters using simple audio analysis
    const blendshapes = this.audioToBlendshapes(audio);
    const headPose = this.generateSubtleHeadMovement(audio.timestamp);

    return {
      timestamp: audio.timestamp,
      blendshapes,
      headPose,
    };
  }

  async render(frame: RenderFrame): Promise<RenderResult> {
    if (!this.initialized) {
      throw new Error("Pipeline not initialized. Call initialize() first.");
    }

    const startTime = Date.now();

    try {
      // TODO: In production, use LivePortrait to render frame
      // 1. Convert blendshapes to MediaPipe landmarks
      // 2. Apply to source image using LivePortrait
      // const imageBuffer = await this.renderWithLivePortrait(frame);

      return {
        success: true,
        frame,
        processingTimeMs: Date.now() - startTime,
        // imageBuffer,
        // format: "jpeg",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Render failed",
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  async cleanup(): Promise<void> {
    console.log("[LivePortrait/MediaPipe] Pipeline cleanup complete");
    this.initialized = false;
  }

  // --- Audio processing methods ---

  private audioToBlendshapes(audio: AudioFrame): Partial<BlendshapeWeights> {
    // Simple audio amplitude to mouth movement mapping
    const amplitude = this.calculateAmplitude(audio.data);
    const t = audio.timestamp / 1000;

    // Map amplitude to mouth opening
    const mouthOpen = Math.min(amplitude * 2, 1) * 0.6;
    const lipMovement = amplitude * 0.4;

    return {
      jawOpen: mouthOpen,
      mouthFunnel: lipMovement * 0.5,
      mouthPucker: Math.sin(t * 3) * 0.1 * amplitude,
      mouthSmileLeft: 0.15,
      mouthSmileRight: 0.15,
      // Natural blink pattern
      eyeBlinkLeft: this.shouldBlink(t) ? 1 : 0,
      eyeBlinkRight: this.shouldBlink(t) ? 1 : 0,
    };
  }

  private calculateAmplitude(data: Buffer | Float32Array): number {
    if (data instanceof Buffer) {
      // Assume 16-bit PCM
      let sum = 0;
      for (let i = 0; i < data.length; i += 2) {
        const sample = data.readInt16LE(i) / 32768;
        sum += Math.abs(sample);
      }
      return sum / (data.length / 2);
    } else {
      // Float32Array
      let sum = 0;
      for (const sample of data) {
        sum += Math.abs(sample);
      }
      return sum / data.length;
    }
  }

  private shouldBlink(timestamp: number): boolean {
    // Blink every 3-5 seconds with some randomness
    const blinkCycle = 4;
    const phase = timestamp % blinkCycle;
    return phase < 0.15 && Math.sin(timestamp * 7) > 0.9;
  }

  private generateSubtleHeadMovement(timestamp: number): HeadPose {
    const t = timestamp / 1000;
    return {
      rotationX: Math.sin(t * 0.15) * 3, // Subtle nodding
      rotationY: Math.sin(t * 0.1) * 5, // Subtle turning
      rotationZ: Math.sin(t * 0.08) * 1.5, // Very subtle tilt
      translationX: 0,
      translationY: Math.sin(t * 0.2) * 2, // Slight up/down
      translationZ: 0,
    };
  }
}

// Singleton instance
export const livePortraitPipeline = new LivePortraitMediaPipePipeline();

export { LivePortraitMediaPipePipeline, LivePortraitConfig };
