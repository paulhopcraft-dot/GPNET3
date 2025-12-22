/**
 * RAG Routes - Knowledge Retrieval API (PRD-9, Spec-11)
 *
 * Endpoints:
 * - GET /api/rag/status - Get RAG service status
 * - POST /api/rag/query - Query knowledge base
 * - POST /api/rag/case-guidance/:caseId - Get case-specific guidance
 * - GET /api/rag/documents - List documents by layer
 * - POST /api/rag/documents - Add document to knowledge base
 */

import express, { type Response } from "express";
import { z } from "zod";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { ragService } from "../services/ragService";
import { logAuditEvent, AuditEventTypes, getRequestMetadata } from "../services/auditLogger";

const router = express.Router();

// Query schema
const ragQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  topK: z.number().optional().default(5),
  minScore: z.number().optional().default(0.1),
  knowledgeLayers: z
    .array(z.enum(["local", "industry", "global"]))
    .optional()
    .default(["local", "industry", "global"]),
});

// Document schema
const documentSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  documentType: z.string().min(1),
  section: z.string().optional(),
});

/**
 * GET /api/rag/status
 * Get RAG service status
 */
router.get("/status", authorize(), async (_req: AuthRequest, res: Response) => {
  const status = ragService.getStatus();
  res.json(status);
});

/**
 * POST /api/rag/query
 * Query the knowledge base
 */
router.post("/query", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = ragQuerySchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid query",
        details: parseResult.error.errors,
      });
    }

    const { query, topK, minScore, knowledgeLayers } = parseResult.data;
    const organizationId = req.user?.organizationId;

    const response = await ragService.query({
      query,
      organizationId,
      topK,
      minScore,
      knowledgeLayers,
    });

    // Log AI advisory query
    await logAuditEvent({
      userId: req.user!.id,
      organizationId: organizationId || null,
      eventType: AuditEventTypes.AI_SUMMARY_GENERATE, // Reusing for AI queries
      metadata: {
        queryType: "rag_query",
        knowledgeLayersUsed: response.knowledgeLayersUsed,
        sourcesCount: response.sources.length,
        confidence: response.confidence,
      },
      ...getRequestMetadata(req),
    });

    res.json({
      ...response,
      disclaimer: "This is advisory information only. Final decisions must be made by humans.",
    });
  } catch (error) {
    console.error("[RAG Route] Error:", error);
    res.status(500).json({
      error: "Failed to query knowledge base",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/rag/case-guidance/:caseId
 * Get case-specific guidance from knowledge base
 */
router.post(
  "/case-guidance/:caseId",
  authorize(),
  requireCaseOwnership(),
  async (req: AuthRequest, res: Response) => {
    try {
      const workerCase = req.workerCase!;
      const { question } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      const response = await ragService.getCaseGuidance(workerCase.id, question, {
        organizationId: workerCase.organizationId,
        workerName: workerCase.workerName,
        riskLevel: workerCase.riskLevel,
        workStatus: workerCase.workStatus,
        complianceIndicator: workerCase.complianceIndicator,
        rtwPlanStatus: workerCase.rtwPlanStatus,
      });

      // Log case-specific AI query
      await logAuditEvent({
        userId: req.user!.id,
        organizationId: workerCase.organizationId,
        eventType: AuditEventTypes.AI_SUMMARY_GENERATE,
        resourceType: "worker_case",
        resourceId: workerCase.id,
        metadata: {
          queryType: "case_guidance",
          knowledgeLayersUsed: response.knowledgeLayersUsed,
          sourcesCount: response.sources.length,
          confidence: response.confidence,
        },
        ...getRequestMetadata(req),
      });

      res.json({
        caseId: workerCase.id,
        ...response,
        disclaimer: "This is advisory information only. Final decisions must be made by humans.",
      });
    } catch (error) {
      console.error("[RAG Route] Case guidance error:", error);
      res.status(500).json({
        error: "Failed to get case guidance",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/rag/documents
 * List documents by knowledge layer
 */
router.get("/documents", authorize(), async (req: AuthRequest, res: Response) => {
  const layer = req.query.layer as "local" | "industry" | "global" | undefined;

  if (layer && !["local", "industry", "global"].includes(layer)) {
    return res.status(400).json({ error: "Invalid layer. Must be local, industry, or global" });
  }

  const documents = layer
    ? ragService.getDocumentsByLayer(layer)
    : [
        ...ragService.getDocumentsByLayer("local"),
        ...ragService.getDocumentsByLayer("industry"),
        ...ragService.getDocumentsByLayer("global"),
      ];

  // Filter local documents to user's organization
  const organizationId = req.user?.organizationId;
  const filteredDocs = documents.filter((doc) => {
    if (doc.metadata.knowledgeLayer === "local") {
      return doc.metadata.organizationId === organizationId;
    }
    return true;
  });

  res.json({
    documents: filteredDocs.map((doc) => ({
      id: doc.id,
      source: doc.metadata.source,
      knowledgeLayer: doc.metadata.knowledgeLayer,
      documentType: doc.metadata.documentType,
      section: doc.metadata.section,
      textPreview: doc.text.substring(0, 200) + (doc.text.length > 200 ? "..." : ""),
    })),
    count: filteredDocs.length,
  });
});

/**
 * POST /api/rag/documents
 * Add document to organization's local knowledge base
 * Admin only
 */
router.post("/documents", authorize(["admin"]), async (req: AuthRequest, res: Response) => {
  try {
    const parseResult = documentSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid document",
        details: parseResult.error.errors,
      });
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Organization required" });
    }

    await ragService.addLocalKnowledge(organizationId, parseResult.data);

    // Log document addition
    await logAuditEvent({
      userId: req.user!.id,
      organizationId,
      eventType: AuditEventTypes.CASE_CREATE, // Reusing for document creation
      resourceType: "rag_document",
      resourceId: parseResult.data.id,
      metadata: {
        documentType: parseResult.data.documentType,
        section: parseResult.data.section,
      },
      ...getRequestMetadata(req),
    });

    res.status(201).json({
      success: true,
      message: "Document added to local knowledge base",
      documentId: `local-${organizationId}-${parseResult.data.id}`,
    });
  } catch (error) {
    console.error("[RAG Route] Document add error:", error);
    res.status(500).json({
      error: "Failed to add document",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
