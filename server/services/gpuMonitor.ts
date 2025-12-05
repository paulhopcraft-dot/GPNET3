import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GpuInfo {
  index: number;
  name: string;
  memory_total_mb: number;
  memory_used_mb: number;
  memory_free_mb: number;
  utilization_percent: number;
  temperature_c: number | null;
}

export interface GpuMetrics {
  available: boolean;
  gpus: GpuInfo[];
  total_vram_gb: number;
  free_vram_gb: number;
  error?: string;
}

/**
 * GPU Monitor utility for checking NVIDIA GPU status via nvidia-smi
 */
class GpuMonitor {
  private lastMetrics: GpuMetrics | null = null;
  private lastCheck: number = 0;
  private cacheMs: number = 1000; // Cache metrics for 1 second

  /**
   * Query GPU metrics using nvidia-smi
   */
  async getMetrics(): Promise<GpuMetrics> {
    // Return cached metrics if still valid
    if (this.lastMetrics && Date.now() - this.lastCheck < this.cacheMs) {
      return this.lastMetrics;
    }

    try {
      const { stdout } = await execAsync(
        "nvidia-smi --query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits",
        { timeout: 5000 }
      );

      const gpus: GpuInfo[] = stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [index, name, memTotal, memUsed, memFree, util, temp] = line
            .split(",")
            .map((s) => s.trim());

          return {
            index: parseInt(index, 10),
            name,
            memory_total_mb: parseInt(memTotal, 10),
            memory_used_mb: parseInt(memUsed, 10),
            memory_free_mb: parseInt(memFree, 10),
            utilization_percent: parseInt(util, 10),
            temperature_c: temp ? parseInt(temp, 10) : null,
          };
        });

      const totalVramMb = gpus.reduce((sum, gpu) => sum + gpu.memory_total_mb, 0);
      const freeVramMb = gpus.reduce((sum, gpu) => sum + gpu.memory_free_mb, 0);

      this.lastMetrics = {
        available: true,
        gpus,
        total_vram_gb: totalVramMb / 1024,
        free_vram_gb: freeVramMb / 1024,
      };
      this.lastCheck = Date.now();

      return this.lastMetrics;
    } catch (error) {
      // nvidia-smi not available or failed
      this.lastMetrics = {
        available: false,
        gpus: [],
        total_vram_gb: 0,
        free_vram_gb: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      this.lastCheck = Date.now();

      return this.lastMetrics;
    }
  }

  /**
   * Get free VRAM in GB, returns simulated value if nvidia-smi unavailable
   */
  async getFreeVramGb(): Promise<number> {
    const metrics = await this.getMetrics();

    if (metrics.available) {
      return metrics.free_vram_gb;
    }

    // Return simulated value when GPU monitoring is unavailable
    // This allows the system to operate without nvidia-smi
    return this.simulateVram();
  }

  /**
   * Check if GPU is available
   */
  async isGpuAvailable(): Promise<boolean> {
    const metrics = await this.getMetrics();
    return metrics.available && metrics.gpus.length > 0;
  }

  /**
   * Get GPU utilization percentage (average across all GPUs)
   */
  async getUtilization(): Promise<number> {
    const metrics = await this.getMetrics();

    if (!metrics.available || metrics.gpus.length === 0) {
      return 0;
    }

    const totalUtil = metrics.gpus.reduce(
      (sum, gpu) => sum + gpu.utilization_percent,
      0
    );
    return totalUtil / metrics.gpus.length;
  }

  /**
   * Simulate VRAM for systems without nvidia-smi
   * Returns a value between 8-16 GB
   */
  private simulateVram(): number {
    return 8 + Math.random() * 8;
  }

  /**
   * Set cache duration in milliseconds
   */
  setCacheDuration(ms: number): void {
    this.cacheMs = ms;
  }

  /**
   * Clear cached metrics
   */
  clearCache(): void {
    this.lastMetrics = null;
    this.lastCheck = 0;
  }
}

// Singleton instance
export const gpuMonitor = new GpuMonitor();

export { GpuMonitor };
