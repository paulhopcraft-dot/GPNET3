import express, { type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { authorize } from "../middleware/auth";
import { insertMedicalCertificateSchema } from "@shared/schema";
import { extractCertificateData } from "../services/certificateService";

const router = express.Router();

// All routes require authentication
const requireAuth = authorize();
const requireAdminOrEmployer = authorize(["admin", "employer"]);
const requireAdminOrEmployerOrClinician = authorize(["admin", "employer", "clinician"]);

// POST /api/certificates - Create certificate
router.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = insertMedicalCertificateSchema.parse(req.body);

    // Ensure organizationId matches user's organization
    if (req.user!.role !== "admin" && data.organizationId !== req.user!.companyId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const certificate = await storage.createCertificate(data);
    res.json({ success: true, data: certificate });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/:id - Get certificate by ID
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }
    const certificate = await storage.getCertificate(req.params.id, organizationId);

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    res.json({ success: true, data: certificate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/case/:caseId - Get certificates by case
router.get("/case/:caseId", requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }
    const certificates = await storage.getCertificatesByCase(req.params.caseId, organizationId);
    res.json({ success: true, data: certificates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/worker/:workerId - Get certificates by worker
router.get("/worker/:workerId", requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }
    const certificates = await storage.getCertificatesByWorker(req.params.workerId, organizationId);
    res.json({ success: true, data: certificates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/organization/:organizationId - Get certificates by organization
router.get("/organization/:organizationId", requireAdminOrEmployer, async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;

    // Check authorization
    if (req.user!.role !== "admin" && organizationId !== req.user!.companyId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const certificates = await storage.getCertificatesByOrganization(organizationId);
    res.json({ success: true, data: certificates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/certificates/:id - Update certificate
router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const updates = insertMedicalCertificateSchema.partial().parse(req.body);
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }

    // Check if certificate exists for this organization
    const existing = await storage.getCertificate(req.params.id, organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    const certificate = await storage.updateCertificate(req.params.id, organizationId, updates);
    res.json({ success: true, data: certificate });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/certificates/:id - Delete certificate
router.delete("/:id", requireAdminOrEmployer, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }

    // Check if certificate exists for this organization
    const existing = await storage.getCertificate(req.params.id, organizationId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    await storage.deleteCertificate(req.params.id, organizationId);
    res.json({ success: true, message: "Certificate deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/certificates/:id/extract - Extract data from certificate OCR
router.post("/:id/extract", requireAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }
    const certificate = await storage.getCertificate(req.params.id, organizationId);

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    const extractedData = await extractCertificateData(certificate);

    const updated = await storage.updateCertificate(req.params.id, organizationId, {
      rawExtractedData: extractedData as any,
      extractionConfidence: extractedData.confidence.overall.toString(),
      requiresReview: extractedData.confidence.overall < 0.8,
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/certificates/:id/review - Mark certificate as reviewed
router.post("/:id/review", requireAdminOrEmployerOrClinician, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.role === "admin" ? (req.query.organizationId as string || req.user!.companyId) : req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }
    const certificate = await storage.getCertificate(req.params.id, organizationId);

    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    const updated = await storage.markCertificateAsReviewed(req.params.id, organizationId, new Date());
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/alerts/unacknowledged - Get unacknowledged alerts
router.get("/alerts/unacknowledged", requireAdminOrEmployer, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "User not associated with organization" });
    }

    const alerts = await storage.getUnacknowledgedAlerts(organizationId);
    res.json({ success: true, data: alerts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/certificates/alerts/:alertId/acknowledge - Acknowledge alert
router.post("/alerts/:alertId/acknowledge", requireAdminOrEmployer, async (req: Request, res: Response) => {
  try {
    const alert = await storage.acknowledgeAlert(req.params.alertId, req.user!.id);
    res.json({ success: true, data: alert });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Zod schema for certificate upload
const certificateUploadSchema = z.object({
  caseId: z.string().min(1, "Case ID is required"),
  documentUrl: z.string().url("Valid document URL required"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  capacity: z.enum(["fit", "partial", "unfit", "unknown"]),
  treatingPractitioner: z.string().optional(),
  practitionerType: z.enum(["gp", "specialist", "physiotherapist", "psychologist", "other"]).optional(),
  notes: z.string().optional(),
  restrictions: z.array(z.object({
    type: z.enum(["modified_duties", "no_lifting", "reduced_hours", "work_from_home", "other"]),
    description: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).optional(),
});

/**
 * POST /api/certificates/upload
 * Upload a new certificate with document URL
 *
 * This endpoint handles direct certificate ingestion:
 * 1. Validates input data
 * 2. Verifies case ownership
 * 3. Creates certificate record
 * 4. Triggers OCR extraction if document URL provided
 */
router.post("/upload", requireAuth, async (req: Request, res: Response) => {
  try {
    // Validate input
    const parseResult = certificateUploadSchema.safeParse(req.body);
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
    const organizationId = req.user!.role === "admin"
      ? (req.query.organizationId as string || req.user!.companyId)
      : req.user!.companyId;

    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }

    // Verify case exists and belongs to organization
    const workerCase = await storage.getGPNet2CaseById(input.caseId, organizationId);
    if (!workerCase) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Create the certificate
    const certificate = await storage.createCertificate({
      caseId: input.caseId,
      organizationId,
      issueDate: new Date(input.issueDate),
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      capacity: input.capacity,
      certificateType: "medical_certificate",
      treatingPractitioner: input.treatingPractitioner || null,
      practitionerType: input.practitionerType || null,
      notes: input.notes || null,
      documentUrl: input.documentUrl,
      source: "manual",
      restrictions: input.restrictions as any || null,
      requiresReview: true, // New uploads need review
    });

    // Trigger OCR extraction
    const extractedData = await extractCertificateData(certificate);

    // Update with extracted data
    const updated = await storage.updateCertificate(certificate.id, organizationId, {
      rawExtractedData: extractedData as any,
      extractionConfidence: extractedData.confidence.overall.toString(),
      requiresReview: extractedData.confidence.overall < 0.8,
    });

    res.status(201).json({
      success: true,
      data: updated,
      extraction: {
        confidence: extractedData.confidence.overall,
        requiresReview: extractedData.confidence.overall < 0.8,
      },
    });
  } catch (error: any) {
    console.error("Certificate upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/certificates/expiring - Get expiring certificates
router.get("/expiring", requireAdminOrEmployer, async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.companyId;
    if (!organizationId) {
      return res.status(400).json({ success: false, message: "Organization ID required" });
    }

    const daysAhead = parseInt(req.query.days as string) || 30;
    const certificates = await storage.getExpiringCertificates(organizationId, daysAhead);

    res.json({
      success: true,
      data: certificates,
      meta: { daysAhead, count: certificates.length }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
