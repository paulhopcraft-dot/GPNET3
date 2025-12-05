import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import avatarPipelineRoutes from "./avatarPipeline";

// Mock the avatar pipeline service
vi.mock("../services/avatarPipeline", () => ({
  avatarPipelineService: {
    getStatus: vi.fn().mockResolvedValue({
      active_pipeline: "a2f_flame",
      is_fallback: false,
      triggered_condition: null,
      a2f_sdk_available: true,
      flame_available: true,
      vram_gb: 12,
      concurrent_sessions: 0,
      consecutive_render_failures: 0,
      last_checked: new Date().toISOString(),
    }),
    getConfig: vi.fn().mockReturnValue({
      fallback_conditions: [
        { type: "a2f_sdk_unavailable", timeout_ms: 500 },
        { type: "high_load", concurrent_sessions: 2 },
      ],
      fallback_pipeline: "liveportrait_mediapipe",
    }),
    updateConfig: vi.fn(),
    selectPipeline: vi.fn().mockResolvedValue("a2f_flame"),
    startSession: vi.fn().mockImplementation((id: string) => ({
      id,
      pipeline: "a2f_flame",
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    })),
    endSession: vi.fn(),
    updateSessionActivity: vi.fn(),
    recordRenderFailure: vi.fn(),
    resetRenderFailures: vi.fn(),
    evaluateFallbackConditions: vi.fn().mockResolvedValue({
      shouldFallback: false,
      triggeredCondition: null,
      metrics: {
        a2f_sdk_available: true,
        flame_available: true,
        vram_gb: 12,
      },
    }),
    getConcurrentSessionCount: vi.fn().mockReturnValue(0),
  },
}));

describe("Avatar Pipeline API Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/api/avatar/pipeline", avatarPipelineRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/avatar/pipeline/status", () => {
    it("returns pipeline status", async () => {
      const response = await request(app).get("/api/avatar/pipeline/status");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("active_pipeline");
      expect(response.body).toHaveProperty("is_fallback");
      expect(response.body).toHaveProperty("vram_gb");
    });
  });

  describe("GET /api/avatar/pipeline/config", () => {
    it("returns pipeline configuration", async () => {
      const response = await request(app).get("/api/avatar/pipeline/config");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("fallback_conditions");
      expect(response.body).toHaveProperty("fallback_pipeline");
    });
  });

  describe("PUT /api/avatar/pipeline/config", () => {
    it("updates pipeline configuration", async () => {
      const newConfig = {
        fallback_pipeline: "liveportrait_mediapipe",
      };

      const response = await request(app)
        .put("/api/avatar/pipeline/config")
        .send(newConfig);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("validates fallback conditions", async () => {
      const invalidConfig = {
        fallback_conditions: [{ invalid: true }],
      };

      const response = await request(app)
        .put("/api/avatar/pipeline/config")
        .send(invalidConfig);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/avatar/pipeline/select", () => {
    it("selects pipeline based on conditions", async () => {
      const response = await request(app).post("/api/avatar/pipeline/select");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("selected_pipeline");
      expect(response.body).toHaveProperty("status");
    });
  });

  describe("POST /api/avatar/pipeline/session/start", () => {
    it("starts a new session", async () => {
      const response = await request(app)
        .post("/api/avatar/pipeline/session/start")
        .send({ session_id: "test-session-123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.session).toHaveProperty("id", "test-session-123");
    });

    it("requires session_id", async () => {
      const response = await request(app)
        .post("/api/avatar/pipeline/session/start")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/avatar/pipeline/session/end", () => {
    it("ends a session", async () => {
      const response = await request(app)
        .post("/api/avatar/pipeline/session/end")
        .send({ session_id: "test-session-123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("requires session_id", async () => {
      const response = await request(app)
        .post("/api/avatar/pipeline/session/end")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/avatar/pipeline/session/heartbeat", () => {
    it("updates session activity", async () => {
      const response = await request(app)
        .post("/api/avatar/pipeline/session/heartbeat")
        .send({ session_id: "test-session-123" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/avatar/pipeline/render/failure", () => {
    it("records render failure", async () => {
      const response = await request(app).post(
        "/api/avatar/pipeline/render/failure"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("POST /api/avatar/pipeline/render/success", () => {
    it("resets render failures", async () => {
      const response = await request(app).post(
        "/api/avatar/pipeline/render/success"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe("GET /api/avatar/pipeline/evaluate", () => {
    it("evaluates fallback conditions", async () => {
      const response = await request(app).get("/api/avatar/pipeline/evaluate");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("should_fallback");
      expect(response.body).toHaveProperty("metrics");
    });
  });
});
