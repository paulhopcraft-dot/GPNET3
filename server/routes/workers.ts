import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { insertWorkerSchema } from "@shared/schema";
import { createLogger } from "../lib/logger";

const logger = createLogger("WorkersRoutes");
const router: Router = express.Router();

/**
 * @route GET /api/workers
 * @desc List all workers for the organization
 * @access Private
 */
router.get("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const workers = await storage.listWorkers(organizationId);
    res.json({ workers });
  } catch (error) {
    logger.error("Error listing workers:", undefined, error);
    res.status(500).json({ error: "Failed to retrieve workers" });
  }
});

/**
 * @route GET /api/workers/:id
 * @desc Get worker profile with full history (assessments, bookings)
 * @access Private
 */
router.get("/:id", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await storage.getWorkerProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "Worker not found" });
    }
    res.json(profile);
  } catch (error) {
    logger.error("Error getting worker profile:", undefined, error);
    res.status(500).json({ error: "Failed to retrieve worker profile" });
  }
});

/**
 * @route POST /api/workers
 * @desc Create or upsert a worker (matched by email)
 * @access Private
 */
router.post("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const validatedData = insertWorkerSchema.parse({
      ...req.body,
      organizationId,
    });
    const worker = await storage.upsertWorkerByEmail(validatedData);
    res.status(201).json({ worker });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating worker:", undefined, error);
    res.status(500).json({ error: "Failed to create worker" });
  }
});

export default router;
