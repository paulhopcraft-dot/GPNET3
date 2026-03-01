import express from "express";
import {
  handleJotFormWebhook,
  registerWebhookForm,
  listWebhookForms,
  deactivateWebhookForm,
} from "../controllers/webhooks";
import { verifyWebhookPassword, webhookRateLimit } from "../webhookSecurity";
import { authorize } from "../middleware/auth";

const router = express.Router();

// Webhook endpoint: JotForm submissions
// Security: Password verification + rate limiting
// organizationId is extracted from form mapping, NOT from user input
router.post(
  "/jotform",
  webhookRateLimit(60), // Max 60 requests per minute per IP
  verifyWebhookPassword("formID"), // Verify password, load form mapping
  handleJotFormWebhook
);

// Admin endpoints for managing webhook form mappings
const requireAdmin = authorize(["admin"]);

// POST /api/webhooks/forms - Register new form for webhook processing
router.post("/forms", requireAdmin, registerWebhookForm);

// GET /api/webhooks/forms?organizationId=xxx - List webhook form mappings
router.get("/forms", requireAdmin, listWebhookForms);

// DELETE /api/webhooks/forms/:id - Deactivate webhook form mapping
router.delete("/forms/:id", requireAdmin, deactivateWebhookForm);

export default router;
