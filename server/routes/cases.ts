import express, { type Response } from "express";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { claimsIntakeSchema } from "@shared/schema";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";

const router = express.Router();

/**
 * POST /api/cases
 * Create a new worker case (claims intake)
 *
 * Required fields:
 * - workerName: string (min 2 chars)
 * - company: string (min 1 char)
 * - dateOfInjury: string (valid date)
 *
 * Optional fields:
 * - injuryDescription: string
 * - owner: string (case manager name)
 *
 * Returns: Created WorkerCase object
 */
router.post("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const organizationId = user.organizationId;

    // Validate input
    const parseResult = claimsIntakeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parseResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const input = parseResult.data;

    // Create the case
    const createdCase = await storage.createWorkerCase(organizationId, input);

    // Log the case creation
    await logAuditEvent({
      userId: user.id,
      organizationId,
      eventType: AuditEventTypes.CASE_CREATE,
      resourceType: "worker_case",
      resourceId: createdCase.id,
      metadata: {
        workerName: input.workerName,
        company: input.company,
        dateOfInjury: input.dateOfInjury,
      },
      ...getRequestMetadata(req),
    });

    res.status(201).json({
      success: true,
      data: createdCase,
    });
  } catch (error) {
    console.error("Failed to create case:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create case",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
