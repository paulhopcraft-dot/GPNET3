import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { webhookFormMappings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export interface WebhookRequest extends Request {
  webhookFormMapping?: {
    id: string;
    formId: string;
    organizationId: string;
    formType: string;
    isActive: boolean;
  };
}

/**
 * Verify webhook password middleware (fail-closed)
 *
 * JotForm supports webhook passwords via:
 * - Query parameter: ?webhook_password=xxx
 * - Header: x-webhook-password: xxx
 *
 * Security approach: FAIL-CLOSED
 * - Any error returns 503 Service Unavailable (NOT allowing request through)
 * - Invalid password returns 401 Unauthorized
 * - Form not registered returns 404 Not Found
 * - Database errors return 503 Service Unavailable
 */
export function verifyWebhookPassword(formIdParam: string = "formID") {
  return async (req: WebhookRequest, res: Response, next: NextFunction) => {
    try {
      // Extract form ID from request body or params
      const formId = req.body?.[formIdParam] || req.params?.formId || req.query?.formId;

      if (!formId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Form ID is required",
        });
      }

      // Extract webhook password from query param or header
      const passwordFromQuery = req.query.webhook_password as string;
      const passwordFromHeader = req.headers["x-webhook-password"] as string;
      const providedPassword = passwordFromQuery || passwordFromHeader;

      if (!providedPassword) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Webhook password is required (via ?webhook_password= or x-webhook-password header)",
        });
      }

      // Look up form mapping in database
      let formMapping;
      try {
        const result = await db
          .select()
          .from(webhookFormMappings)
          .where(eq(webhookFormMappings.formId, formId))
          .limit(1);

        formMapping = result[0];
      } catch (dbError) {
        console.error("Database error during webhook authentication:", dbError);
        // FAIL-CLOSED: Database errors block the request
        return res.status(503).json({
          error: "Service Unavailable",
          message: "Unable to verify webhook authentication",
        });
      }

      // Check if form is registered
      if (!formMapping) {
        return res.status(404).json({
          error: "Not Found",
          message: "Form not registered for webhook processing",
        });
      }

      // Check if form mapping is active
      if (!formMapping.isActive) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Webhook processing is disabled for this form",
        });
      }

      // Verify password using constant-time comparison (prevents timing attacks)
      const isPasswordValid = crypto.timingSafeEqual(
        Buffer.from(providedPassword),
        Buffer.from(formMapping.webhookPassword)
      );

      if (!isPasswordValid) {
        // Log failed authentication attempt
        console.warn(`Failed webhook authentication for form ${formId}`, {
          formId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });

        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid webhook password",
        });
      }

      // Authentication successful - attach form mapping to request
      req.webhookFormMapping = {
        id: formMapping.id,
        formId: formMapping.formId,
        organizationId: formMapping.organizationId,
        formType: formMapping.formType,
        isActive: formMapping.isActive,
      };

      // Log successful authentication
      console.info(`Webhook authenticated successfully for form ${formId}`, {
        formId,
        organizationId: formMapping.organizationId,
        formType: formMapping.formType,
      });

      next();
    } catch (error) {
      // FAIL-CLOSED: Unexpected errors block the request
      console.error("Unexpected error in webhook authentication:", error);
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Webhook authentication system error",
      });
    }
  };
}

/**
 * Verify webhook HMAC signature (for future Freshdesk/other services)
 *
 * Uses HMAC-SHA256 to verify webhook integrity
 * Prevents replay attacks with timestamp validation
 */
export function verifyWebhookSignature(serviceName: string) {
  return async (req: WebhookRequest, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["x-webhook-signature"] as string;
      const timestamp = req.headers["x-webhook-timestamp"] as string;

      if (!signature || !timestamp) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Webhook signature and timestamp required",
        });
      }

      // Replay attack prevention (5 minute window)
      const requestTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Webhook timestamp too old (replay attack prevention)",
        });
      }

      // Get organization from request (set by previous middleware or body)
      const organizationId = req.webhookFormMapping?.organizationId || req.body?.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Organization ID required for signature verification",
        });
      }

      // Look up webhook secret for this organization and service
      // This would query the webhook_secrets table from migration 0003
      // For now, return 501 Not Implemented
      return res.status(501).json({
        error: "Not Implemented",
        message: "HMAC signature verification not yet implemented",
      });
    } catch (error) {
      // FAIL-CLOSED: Errors block the request
      console.error("Webhook signature verification error:", error);
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Signature verification system error",
      });
    }
  };
}

/**
 * Rate limiting for webhook endpoints
 * Prevents abuse and DoS attacks
 */
export function webhookRateLimit(maxRequestsPerMinute: number = 60) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || "unknown";
    const now = Date.now();

    let record = requestCounts.get(ip);

    if (!record || now > record.resetAt) {
      // Reset or create new record
      record = {
        count: 1,
        resetAt: now + 60000, // 1 minute from now
      };
      requestCounts.set(ip, record);
      return next();
    }

    if (record.count >= maxRequestsPerMinute) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Maximum ${maxRequestsPerMinute} requests per minute.`,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}
