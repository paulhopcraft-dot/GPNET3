import express, { type Response, type Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { authorize, type AuthRequest } from "../middleware/auth";
import { storage } from "../storage";
import { createLogger } from "../lib/logger";

const logger = createLogger("ChatRoutes");
const router: Router = express.Router();

// Load Dr. Alex soul from config file — edit config/DR_ALEX_SOUL.md to change persona
function loadSoul(): string {
  try {
    const soulPath = join(process.cwd(), "config", "DR_ALEX_SOUL.md");
    return readFileSync(soulPath, "utf-8");
  } catch {
    logger.error("DR_ALEX_SOUL.md not found — using fallback persona");
    return "You are Dr. Alex, a warm and professional workplace health specialist at Preventli. Help users with health questions. Do not diagnose or prescribe. If they need a doctor, end with [SUGGEST_BOOKING].";
  }
}

// Loaded once at startup — restart server to pick up soul changes
const SOUL = loadSoul();

/**
 * @route POST /api/chat/message
 * @desc Send a message to Dr. Alex (Health Assistant)
 * @access Private
 */
router.post("/message", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { message, sessionId, context } = req.body as {
      message: string;
      sessionId: string;
      context?: { caseId?: string; workerId?: string };
    };

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    // Build optional case context if user is on a case page
    let contextBlock = "";
    if (context?.caseId) {
      try {
        const workerCase = await storage.getGPNet2CaseById(context.caseId, req.user!.organizationId);
        if (workerCase) {
          contextBlock = `\n\n---\nCurrent case context (use this to personalise your response):\n- Worker: ${workerCase.workerName}\n- Company: ${workerCase.company}\n- Work status: ${workerCase.workStatus}\n- Summary: ${workerCase.summary}`;
        }
      } catch {
        // context load failure is non-fatal
      }
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SOUL + contextBlock,
      messages: [{ role: "user", content: message }],
    });

    const content = response.content[0];
    let reply = content.type === "text" ? content.text : "";

    // Detect booking suggestion signal from soul
    const suggestBooking = reply.includes("[SUGGEST_BOOKING]");
    reply = reply.replace("[SUGGEST_BOOKING]", "").trim();

    res.json({ reply, sessionId, suggestBooking });
  } catch (error) {
    logger.error("Chat error:", undefined, error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;
