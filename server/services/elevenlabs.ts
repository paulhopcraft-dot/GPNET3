/**
 * ElevenLabs Text-to-Speech Service
 *
 * Provides high-quality voice synthesis for avatar speech.
 * Falls back to placeholder when API key is not configured.
 */

import { Readable } from "stream";

export interface VoiceConfig {
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface StreamOptions {
  optimize_streaming_latency?: number;
  output_format?: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_22050" | "pcm_24000" | "pcm_44100";
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM", // Rachel
  modelId: "eleven_turbo_v2",
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
  useSpeakerBoost: true,
};

const DEFAULT_STREAM_OPTIONS: StreamOptions = {
  optimize_streaming_latency: 3,
  output_format: "pcm_22050",
};

class ElevenLabsService {
  private apiKey: string | null;
  private baseUrl = "https://api.elevenlabs.io/v1";
  private voiceConfig: VoiceConfig;

  constructor(config?: Partial<VoiceConfig>) {
    this.apiKey = process.env.ELEVENLABS_API_KEY || null;
    this.voiceConfig = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  /**
   * Check if ElevenLabs is configured and available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    if (!this.apiKey) {
      console.warn("[ElevenLabs] API key not configured");
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.statusText}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error("[ElevenLabs] Error fetching voices:", error);
      return [];
    }
  }

  /**
   * Generate speech from text (non-streaming)
   */
  async textToSpeech(text: string, options?: Partial<VoiceConfig>): Promise<Buffer | null> {
    if (!this.apiKey) {
      console.warn("[ElevenLabs] API key not configured, returning null");
      return null;
    }

    const config = { ...this.voiceConfig, ...options };

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${config.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: config.modelId,
            voice_settings: {
              stability: config.stability,
              similarity_boost: config.similarityBoost,
              style: config.style,
              use_speaker_boost: config.useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("[ElevenLabs] TTS error:", error);
      return null;
    }
  }

  /**
   * Stream speech from text
   */
  async textToSpeechStream(
    text: string,
    options?: Partial<VoiceConfig & StreamOptions>
  ): Promise<Readable | null> {
    if (!this.apiKey) {
      console.warn("[ElevenLabs] API key not configured, returning null");
      return null;
    }

    const config = { ...this.voiceConfig, ...options };
    const streamOptions = { ...DEFAULT_STREAM_OPTIONS, ...options };

    try {
      const url = new URL(
        `${this.baseUrl}/text-to-speech/${config.voiceId}/stream`
      );
      url.searchParams.set(
        "optimize_streaming_latency",
        String(streamOptions.optimize_streaming_latency)
      );
      url.searchParams.set("output_format", streamOptions.output_format || "pcm_22050");

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: config.modelId,
          voice_settings: {
            stability: config.stability,
            similarity_boost: config.similarityBoost,
            style: config.style,
            use_speaker_boost: config.useSpeakerBoost,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Stream TTS failed: ${response.statusText}`);
      }

      // Convert web ReadableStream to Node.js Readable
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      return new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) {
              this.push(null);
            } else {
              this.push(Buffer.from(value));
            }
          } catch (error) {
            this.destroy(error as Error);
          }
        },
      });
    } catch (error) {
      console.error("[ElevenLabs] Stream TTS error:", error);
      return null;
    }
  }

  /**
   * Update voice configuration
   */
  setVoiceConfig(config: Partial<VoiceConfig>): void {
    this.voiceConfig = { ...this.voiceConfig, ...config };
  }

  /**
   * Get current voice configuration
   */
  getVoiceConfig(): VoiceConfig {
    return { ...this.voiceConfig };
  }
}

// Singleton instance
export const elevenLabsService = new ElevenLabsService();

export { ElevenLabsService };
