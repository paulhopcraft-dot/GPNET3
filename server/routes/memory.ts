import express from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { authorize, type AuthRequest } from "../middleware/auth";
import { createLogger } from "../lib/logger";

const router = express.Router();
const logger = createLogger("Memory");

// Memory file paths
const MEMORY_BASE_PATH = path.join(process.cwd(), ".claude", "v3", "memory");
const DECISIONS_FILE = path.join(MEMORY_BASE_PATH, "decisions.json");
const LEARNINGS_FILE = path.join(MEMORY_BASE_PATH, "learnings.json");
const SESSIONS_DIR = path.join(MEMORY_BASE_PATH, "sessions");

// Validation schemas
const createDecisionSchema = z.object({
  content: z.string().min(1, "Content is required"),
  rationale: z.string().min(1, "Rationale is required"),
  appliesTo: z.array(z.string()).min(1, "Must apply to at least one project"),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const createLearningSchema = z.object({
  pattern: z.string().min(1, "Pattern is required"),
  source: z.string().min(1, "Source is required"),
  successRate: z.string().optional(),
  appliesTo: z.array(z.string()).min(1, "Must apply to at least one area"),
  details: z.string().optional(),
});

const createSessionSchema = z.object({
  sessionName: z.string().min(1, "Session name is required"),
  content: z.string().min(1, "Content is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  metadata: z.record(z.any()).optional(),
});

// Utility functions
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readMemoryFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Error reading memory file ${filePath}:`, undefined, error);
    return defaultValue;
  }
}

function writeMemoryFile<T>(filePath: string, data: T): void {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error(`Error writing memory file ${filePath}:`, undefined, error);
    throw new Error(`Failed to write memory file: ${(error as Error).message}`);
  }
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${random}`;
}

// GET /api/v1/memory/decisions - Get all strategic decisions
router.get("/decisions", authorize(), async (req: AuthRequest, res) => {
  try {
    const appliesTo = req.query.appliesTo as string;
    const decisions = readMemoryFile<any[]>(DECISIONS_FILE, []);

    let filteredDecisions = decisions;
    if (appliesTo) {
      filteredDecisions = decisions.filter((decision: any) =>
        decision.applies_to?.includes(appliesTo) || decision.appliesTo?.includes(appliesTo)
      );
    }

    logger.info(`Retrieved ${filteredDecisions.length} decisions`, {
      userId: req.user!.id,
      appliesTo,
      totalDecisions: decisions.length
    });

    res.json({
      success: true,
      data: filteredDecisions,
      total: filteredDecisions.length
    });
  } catch (error) {
    logger.error("Error retrieving decisions:", undefined, error);
    res.status(500).json({
      error: "Failed to retrieve decisions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/v1/memory/decisions - Create new strategic decision
router.post("/decisions", authorize(), async (req: AuthRequest, res) => {
  try {
    const validation = createDecisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors
      });
    }

    const { content, rationale, appliesTo, sessionId, metadata } = validation.data;
    const decisions = readMemoryFile<any[]>(DECISIONS_FILE, []);

    const newDecision = {
      id: generateId("d"),
      type: "decision",
      content,
      rationale,
      applies_to: appliesTo, // Use snake_case for consistency with existing files
      created: new Date().toISOString(),
      session: sessionId || `session-${Date.now()}`,
      metadata: metadata || {}
    };

    decisions.push(newDecision);
    writeMemoryFile(DECISIONS_FILE, decisions);

    logger.info("Created new decision", {
      userId: req.user!.id,
      decisionId: newDecision.id,
      appliesTo,
      sessionId
    });

    res.status(201).json({
      success: true,
      data: newDecision,
      message: "Decision created successfully"
    });
  } catch (error) {
    logger.error("Error creating decision:", undefined, error);
    res.status(500).json({
      error: "Failed to create decision",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/v1/memory/learnings - Get technical learnings
router.get("/learnings", authorize(), async (req: AuthRequest, res) => {
  try {
    const appliesTo = req.query.appliesTo as string;
    const learnings = readMemoryFile<any[]>(LEARNINGS_FILE, []);

    let filteredLearnings = learnings;
    if (appliesTo) {
      filteredLearnings = learnings.filter((learning: any) =>
        learning.applies_to?.includes(appliesTo) || learning.appliesTo?.includes(appliesTo)
      );
    }

    logger.info(`Retrieved ${filteredLearnings.length} learnings`, {
      userId: req.user!.id,
      appliesTo,
      totalLearnings: learnings.length
    });

    res.json({
      success: true,
      data: filteredLearnings,
      total: filteredLearnings.length
    });
  } catch (error) {
    logger.error("Error retrieving learnings:", undefined, error);
    res.status(500).json({
      error: "Failed to retrieve learnings",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/v1/memory/learnings - Create new learning
router.post("/learnings", authorize(), async (req: AuthRequest, res) => {
  try {
    const validation = createLearningSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors
      });
    }

    const { pattern, source, successRate, appliesTo, details } = validation.data;
    const learnings = readMemoryFile<any[]>(LEARNINGS_FILE, []);

    const newLearning = {
      id: generateId("l"),
      type: "learning",
      pattern,
      source,
      success_rate: successRate || null,
      applies_to: appliesTo, // Use snake_case for consistency
      details: details || null,
      created: new Date().toISOString()
    };

    learnings.push(newLearning);
    writeMemoryFile(LEARNINGS_FILE, learnings);

    logger.info("Created new learning", {
      userId: req.user!.id,
      learningId: newLearning.id,
      appliesTo,
      source
    });

    res.status(201).json({
      success: true,
      data: newLearning,
      message: "Learning created successfully"
    });
  } catch (error) {
    logger.error("Error creating learning:", undefined, error);
    res.status(500).json({
      error: "Failed to create learning",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/v1/memory/sessions/:sessionId - Get session context
router.get("/sessions/:sessionId", authorize(), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({
        error: "Session not found",
        details: `Session ${sessionId} does not exist`
      });
    }

    const sessionData = readMemoryFile(sessionFile, null);

    logger.info("Retrieved session context", {
      userId: req.user!.id,
      sessionId
    });

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    logger.error("Error retrieving session:", undefined, error);
    res.status(500).json({
      error: "Failed to retrieve session",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/v1/memory/sessions - Create session context
router.post("/sessions", authorize(), async (req: AuthRequest, res) => {
  try {
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors
      });
    }

    const { sessionName, content, priority, metadata } = validation.data;
    ensureDirectoryExists(SESSIONS_DIR);

    const sessionFile = path.join(SESSIONS_DIR, `${sessionName}.json`);
    const sessionData = {
      id: generateId("c"),
      type: "context",
      session_name: sessionName,
      content,
      priority,
      active: true,
      created: new Date().toISOString(),
      metadata: metadata || {}
    };

    writeMemoryFile(sessionFile, sessionData);

    logger.info("Created new session context", {
      userId: req.user!.id,
      sessionName,
      priority
    });

    res.status(201).json({
      success: true,
      data: sessionData,
      message: "Session context created successfully"
    });
  } catch (error) {
    logger.error("Error creating session:", undefined, error);
    res.status(500).json({
      error: "Failed to create session",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/v1/memory/sessions - List all sessions
router.get("/sessions", authorize(), async (req: AuthRequest, res) => {
  try {
    ensureDirectoryExists(SESSIONS_DIR);
    const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(file => file.endsWith('.json'));

    const sessions = sessionFiles.map(file => {
      const sessionPath = path.join(SESSIONS_DIR, file);
      const sessionData = readMemoryFile<Record<string, any> | null>(sessionPath, null);
      return sessionData ? {
        sessionName: file.replace('.json', ''),
        ...sessionData
      } : null;
    }).filter(session => session !== null);

    logger.info(`Retrieved ${sessions.length} sessions`, {
      userId: req.user!.id
    });

    res.json({
      success: true,
      data: sessions,
      total: sessions.length
    });
  } catch (error) {
    logger.error("Error listing sessions:", undefined, error);
    res.status(500).json({
      error: "Failed to list sessions",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GET /api/v1/memory/stats - Get memory system statistics
router.get("/stats", authorize(), async (req: AuthRequest, res) => {
  try {
    const decisions = readMemoryFile<any[]>(DECISIONS_FILE, []);
    const learnings = readMemoryFile<any[]>(LEARNINGS_FILE, []);

    ensureDirectoryExists(SESSIONS_DIR);
    const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(file => file.endsWith('.json'));

    const stats = {
      decisions: {
        total: decisions.length,
        byProject: decisions.reduce((acc: any, decision: any) => {
          const projects = decision.applies_to || decision.appliesTo || [];
          projects.forEach((project: string) => {
            acc[project] = (acc[project] || 0) + 1;
          });
          return acc;
        }, {})
      },
      learnings: {
        total: learnings.length,
        byArea: learnings.reduce((acc: any, learning: any) => {
          const areas = learning.applies_to || learning.appliesTo || [];
          areas.forEach((area: string) => {
            acc[area] = (acc[area] || 0) + 1;
          });
          return acc;
        }, {})
      },
      sessions: {
        total: sessionFiles.length
      },
      totalMemoryItems: decisions.length + learnings.length + sessionFiles.length
    };

    logger.info("Retrieved memory statistics", {
      userId: req.user!.id,
      totalItems: stats.totalMemoryItems
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error("Error retrieving memory stats:", undefined, error);
    res.status(500).json({
      error: "Failed to retrieve memory statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;