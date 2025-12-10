/**
 * Notification API Routes
 *
 * Admin endpoints for viewing and managing automated notifications.
 */

import express, { Request, Response } from "express";
import { authorize } from "../middleware/auth";
import { storage } from "../storage";
import {
  getRecentNotifications,
  getNotificationsByCase,
  getNotificationStats,
} from "../services/notificationService";
import { sendTestEmail } from "../services/emailService";
import type { AuthRequest } from "../middleware/auth";

const router = express.Router();

/**
 * GET /api/notifications/recent
 * Get recent notifications (last 24 hours by default)
 * Admin only
 */
router.get("/recent", authorize(), async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const notifications = await getRecentNotifications(storage, hours);

    res.json({
      success: true,
      data: notifications,
      meta: {
        count: notifications.length,
        hours,
      },
    });
  } catch (error) {
    console.error("[NotificationRoutes] Error fetching recent notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 * Admin only
 */
router.get("/stats", authorize(), async (_req: Request, res: Response) => {
  try {
    const stats = await getNotificationStats(storage);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("[NotificationRoutes] Error fetching stats:", error);
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
router.get("/case/:caseId", authorize(), async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const notifications = await getNotificationsByCase(storage, caseId);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("[NotificationRoutes] Error fetching case notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch case notifications",
    });
  }
});

/**
 * POST /api/notifications/test
 * Send a test notification email to the current user
 * Admin only
 */
router.post("/test", authorize(), async (req: AuthRequest, res: Response) => {
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
    console.error("[NotificationRoutes] Error sending test email:", error);
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
 */
router.post("/trigger", authorize(), async (_req: Request, res: Response) => {
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
    console.error("[NotificationRoutes] Error triggering notifications:", error);
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
 */
router.post("/send", authorize(), async (_req: Request, res: Response) => {
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
    console.error("[NotificationRoutes] Error sending notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send notifications",
    });
  }
});

export default router;
