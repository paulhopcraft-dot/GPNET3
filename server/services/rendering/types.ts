/**
 * Avatar Rendering Pipeline Types
 */

export interface AudioFrame {
  data: Buffer | Float32Array;
  sampleRate: number;
  channels: number;
  timestamp: number;
}

export interface BlendshapeWeights {
  // ARKit-compatible blendshapes
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  eyeSquintLeft: number;
  eyeSquintRight: number;
  eyeWideLeft: number;
  eyeWideRight: number;
  eyeLookDownLeft: number;
  eyeLookDownRight: number;
  eyeLookInLeft: number;
  eyeLookInRight: number;
  eyeLookOutLeft: number;
  eyeLookOutRight: number;
  eyeLookUpLeft: number;
  eyeLookUpRight: number;
  browDownLeft: number;
  browDownRight: number;
  browInnerUp: number;
  browOuterUpLeft: number;
  browOuterUpRight: number;
  cheekPuff: number;
  cheekSquintLeft: number;
  cheekSquintRight: number;
  jawForward: number;
  jawLeft: number;
  jawRight: number;
  jawOpen: number;
  mouthClose: number;
  mouthDimpleLeft: number;
  mouthDimpleRight: number;
  mouthFrownLeft: number;
  mouthFrownRight: number;
  mouthFunnel: number;
  mouthLeft: number;
  mouthLowerDownLeft: number;
  mouthLowerDownRight: number;
  mouthPressLeft: number;
  mouthPressRight: number;
  mouthPucker: number;
  mouthRight: number;
  mouthRollLower: number;
  mouthRollUpper: number;
  mouthShrugLower: number;
  mouthShrugUpper: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  mouthStretchLeft: number;
  mouthStretchRight: number;
  mouthUpperUpLeft: number;
  mouthUpperUpRight: number;
  noseSneerLeft: number;
  noseSneerRight: number;
  tongueOut: number;
}

export interface HeadPose {
  rotationX: number; // pitch
  rotationY: number; // yaw
  rotationZ: number; // roll
  translationX: number;
  translationY: number;
  translationZ: number;
}

export interface RenderFrame {
  timestamp: number;
  blendshapes: Partial<BlendshapeWeights>;
  headPose?: HeadPose;
  imageData?: Buffer; // For image-based pipelines
  width?: number;
  height?: number;
}

export interface RenderResult {
  success: boolean;
  frame?: RenderFrame;
  imageBuffer?: Buffer;
  format?: "jpeg" | "png" | "webp";
  error?: string;
  processingTimeMs: number;
}

export interface PipelineConfig {
  endpoint?: string;
  timeout?: number;
  quality?: "low" | "medium" | "high";
  targetFps?: number;
}

/**
 * Base interface for all rendering pipelines
 */
export interface RenderingPipeline {
  name: string;
  isAvailable(): Promise<boolean>;
  initialize(config?: PipelineConfig): Promise<void>;
  processAudio(audio: AudioFrame): Promise<RenderFrame>;
  render(frame: RenderFrame): Promise<RenderResult>;
  cleanup(): Promise<void>;
}
