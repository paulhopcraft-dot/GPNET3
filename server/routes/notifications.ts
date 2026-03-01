/**
 * Notification API Routes
 *
 * Admin endpoints for viewing and managing automated notifications.
 */

import express, { Request, Response } from "express";
import { authorize, type AuthRequest } from "../middleware/auth";
import { requireCaseOwnership } from "../middleware/caseOwnership";
import { storage } from "../storage";
import { logger } from "../lib/logger";
import {
  getRecentNotifications,
  getNotificationsByCase,
  getNotificationStats,
} from "../services/notificationService";
import { sendTestEmail } from "../services/emailService";

const router = express.Router();

/**
 * GET /api/notifications/recent
 * Get recent notifications (last 24 hours by default)
 */
router.get("/recent", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const hours = parseInt(req.query.hours as string) || 24;
    const notifications = await getRecentNotifications(storage, organizationId, hours);

    res.json({
      success: true,
      data: notifications,
      meta: {
        count: notifications.length,
        hours,
      },
    });
  } catch (error) {
    logger.notification.error("Error fetching recent notifications", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get("/stats", authorize(), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const stats = await getNotificationStats(storage, organizationId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.notification.error("Error fetching stats", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notification statistics",
    });
  }
});

/**
 * GET /api/notifications/case/:caseId
 * Get notifications for a specific case
 */
router.get("/case/:caseId", authorize(), requireCaseOwnership(), async (req: AuthRequest, res: Response) => {
  try {
    const workerCase = req.workerCase!; // Populated by requireCaseOwnership middleware
    const notifications = await getNotificationsByCase(storage, workerCase.id, workerCase.organizationId);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    logger.notification.error("Error fetching case notifications", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch case notifications",
    });
  }
});

// Admin-only middleware
const requireAdmin = authorize(["admin"]);

/**
 * POST /api/notifications/test
 * Send a test notification email to the current user
 * Admin only
 * SECURITY: requireAdmin enforces admin role check
 */
router.post("/test", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "No email address available for test",
      });
    }

    const result = await sendTestEmail(email);

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${email}`,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || "Failed to send test email",
      });
    }
  } catch (error) {
    logger.notification.error("Error sending test email", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to send test email",
    });
  }
});

/**
 * POST /api/notifications/trigger
 * Manually trigger notification generation
 * Admin only - useful for testing
 * SECURITY: requireAdmin enforces admin role check
 */
router.post("/trigger", requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Import scheduler dynamically to avoid circular dependencies
    const { notificationScheduler } = await import("../index");

    if (!notificationScheduler) {
      return res.status(503).json({
        success: false,
        error: "Notification scheduler not initialized",
      });
    }

    const count = await notificationScheduler.triggerGeneration();

    res.json({
      success: true,
      message: `Generated ${count} notifications`,
      count,
    });
  } catch (error) {
    logger.notification.error("Error triggering notifications", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to trigger notification generation",
    });
  }
});

/**
 * POST /api/notifications/send
 * Manually trigger notification sending
 * Admin only - useful for testing
 * SECURITY: requireAdmin enforces admin role check
 */
router.post("/send", requireAdmin, async (_req: Request, res: Response) => {
  try {
    // Import scheduler dynamically to avoid circular dependencies
    const { notificationScheduler } = await import("../index");

    if (!notificationScheduler) {
      return res.status(503).json({
        success: false,
        error: "Notification scheduler not initialized",
      });
    }

    const result = await notificationScheduler.triggerSending();

    res.json({
      success: true,
      message: `Sent ${result.sent} notifications, ${result.failed} failed`,
      ...result,
    });
  } catch (error) {
    logger.notification.error("Error sending notifications", {}, error);
    res.status(500).json({
      success: false,
      error: "Failed to send notifications",
    });
  }
});

/**
 * POST /api/notifications/send-certificate-alerts
 * Manually send certificate expiry alerts directly to workers
 * Admin only - sends 3-day worker email alerts
 * SECURITY: requireAdmin enforces admin role check
 */
router.post("/send-certificate-alerts", requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Import function to send certificate alerts to workers
    const { sendWorkerCertificateAlerts } = await import("../services/notificationService");

    const organizationId = req.user!.organizationId;
    const result = await sendWorkerCertificateAlerts(storage, organizationId);

    logger.notification.info("Manual worker certificate alerts triggered", {
      userId: req.user!.id,
      organizationId,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors
    });

    res.json({
      success: true,
      message: result.sent > 0
        ? `Sent ${result.sent} certificate alerts to workers${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        : "No certificate alerts needed at this time",
      sent: result.sent,
      failed: result.failed,
      errors: result.errors
    });
  } catch (error) {
    logger.notification.error("Error sending worker certificate alerts", {
      userId: req.user?.id,
      organizationId: req.user?.organizationId
    }, error);
    res.status(500).json({
      success: false,
      error: "Failed to send certificate alerts",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
