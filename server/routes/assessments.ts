import express, { type Request, type Response, type NextFunction, type Router } from "express";
import multer from "multer";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "../storage";
import { authorize, type AuthRequest } from "../middleware/auth";
import { sendEmail } from "../services/emailService";
import { jdUpload, getJdFileUrl } from "../services/fileUpload";
import { createLogger } from "../lib/logger";

const logger = createLogger("AssessmentsRoutes");
const router: Router = express.Router();

const createAssessmentSchema = z.object({
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  positionTitle: z.string().min(1),
  startDate: z.string().optional(),
  jobDescription: z.string().optional(),
});

/**
 * @route POST /api/assessments
 * @desc Create a new pre-employment assessment, upsert worker record
 * @access Private
 *
 * Accepts multipart/form-data so the employer can attach a job description
 * file (PDF/DOC/DOCX) alongside the text fields.
 */
/** Multer error handler — converts file-filter rejections from 500 → 400 */
function uploadJd(req: Request, res: Response, next: NextFunction) {
  jdUpload.single("jobDescriptionFile")(req, res, (err) => {
    if (err instanceof multer.MulterError || err instanceof Error) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });
}

router.post("/", authorize(), uploadJd, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    const body = createAssessmentSchema.parse(req.body);

    // Require at least a text description OR a file attachment
    const hasText = !!(body.jobDescription?.trim());
    const hasFile = !!req.file;
    if (!hasText && !hasFile) {
      return res.status(400).json({
        error: "Please provide a role description or attach a job description document.",
      });
    }

    const jobDescriptionFileUrl = hasFile ? getJdFileUrl(req.file!.filename) : undefined;

    // Upsert worker record
    const worker = await storage.upsertWorkerByEmail({
      name: body.candidateName,
      email: body.candidateEmail,
      organizationId,
    });

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString("hex");

    // Create assessment record
    const assessment = await storage.createPreEmploymentAssessment({
      organizationId,
      workerId: worker.id,
      candidateName: body.candidateName,
      candidateEmail: body.candidateEmail,
      positionTitle: body.positionTitle,
      assessmentType: "baseline_health",
      status: "created",
      accessToken,
      jobDescription: body.jobDescription,
      jobDescriptionFileUrl,
      createdBy: userId,
    } as Parameters<typeof storage.createPreEmploymentAssessment>[0]);

    logger.info("Assessment created", { assessmentId: assessment.id, workerId: worker.id });
    res.status(201).json({ assessment, worker });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    logger.error("Error creating assessment:", undefined, error);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});

/**
 * @route POST /api/assessments/:id/send
 * @desc Email the questionnaire link to the worker
 * @access Private
 */
router.post("/:id/send", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const assessment = await storage.getPreEmploymentAssessmentById(id, organizationId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    if (!assessment.accessToken) {
      return res.status(400).json({ error: "Assessment has no access token" });
    }
    if (!assessment.candidateEmail) {
      return res.status(400).json({ error: "Assessment has no candidate email" });
    }

    const appUrl = process.env.APP_URL ?? "http://localhost:5000";
    const link = `${appUrl}/check/${assessment.accessToken}`;

    await sendEmail({
      to: assessment.candidateEmail,
      subject: `Pre-Employment Health Check — ${assessment.positionTitle}`,
      body: `Hi ${assessment.candidateName},

Please complete your pre-employment health questionnaire using the secure link below:

${link}

This link is personal to you. Please do not share it.

If you have any questions, please contact us.

— Preventli Health Team`,
    });

    await storage.updatePreEmploymentAssessmentStatus(id, organizationId, {
      status: "sent",
      sentAt: new Date(),
    });

    logger.info("Questionnaire link sent", { assessmentId: id, to: assessment.candidateEmail });
    res.json({ success: true, sentTo: assessment.candidateEmail });
  } catch (error) {
    logger.error("Error sending assessment:", undefined, error);
    res.status(500).json({ error: "Failed to send assessment" });
  }
});

/**
 * @route GET /api/assessments
 * @desc List assessments for the organization
 * @access Private
 */
router.get("/", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const all = await storage.getPreEmploymentAssessments(organizationId);
    // Return only the fields the UI needs (exclude sensitive internals like accessToken)
    const assessments = all.map(a => ({
      id: a.id,
      workerId: a.workerId,
      candidateName: a.candidateName,
      positionTitle: a.positionTitle,
      assessmentType: a.assessmentType,
      status: a.status,
      clearanceLevel: a.clearanceLevel,
      sentAt: a.sentAt,
      createdAt: a.createdAt,
    }));
    res.json({ assessments });
  } catch (error) {
    logger.error("Error listing assessments:", undefined, error);
    res.status(500).json({ error: "Failed to retrieve assessments" });
  }
});

/**
 * @route GET /api/assessments/:id
 * @desc Get single assessment
 * @access Private
 */
router.get("/:id", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;
    const assessment = await storage.getPreEmploymentAssessmentById(id, organizationId);
    if (!assessment) return res.status(404).json({ error: "Not found" });
    res.json({ assessment });
  } catch (error) {
    logger.error("Error getting assessment:", undefined, error);
    res.status(500).json({ error: "Failed to retrieve assessment" });
  }
});

export default router;
